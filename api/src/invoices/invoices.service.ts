import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { nextNumberTx } from "../common/numbers";
import { rmaRemainingCredit } from "../common/rma";
import { invoiceTotals } from "../common/invoice";
import { formatMoney, resolvePrintCurrency } from "../common/money";
import { buildEvenInstallments, recordPaymentTx, updatePaymentTx } from "../common/payments";
import { MailService } from "../mail/mail.service";
import { buildInvoicePdf } from "./invoice-pdf";
import {
  CreateInstallmentPlanDto,
  CreateInvoiceDto,
  PayInstallmentDto,
  RecordPaymentDto,
  SendInvoiceEmailDto,
  UpdateInvoiceLineDto,
  UpdateInvoiceMarginVatDto,
  UpdateInvoiceShippingDto,
  UpdatePaymentDto,
} from "./dto/invoice.dto";

function stockStatusForInvoice(status: string) {
  return status === "PAID" ? "SOLD" : "RESERVED";
}

type NormalizedInvoiceLine = {
  productName: string;
  color: string;
  network: string;
  grade: string;
  qty: number;
  unitPriceGbp: number;
  buyPriceGbp: number;
  imeis: string[];
  sortOrder: number;
};

function normalizeLines(lines: CreateInvoiceDto["lines"]): NormalizedInvoiceLine[] {
  const normalized: NormalizedInvoiceLine[] = [];
  lines.forEach((line, i) => {
    const productName = (line.productName ?? "").trim();
    const qty = Number(line.qty) || 0;
    if (!productName || qty <= 0) return;
    const imeis = (line.imeis ?? []).map((imei) => imei.trim()).filter(Boolean);
    normalized.push({
      productName,
      color: (line.color ?? "").toString().trim() || "Black",
      network: (line.network ?? "").toString().trim() || "Unlocked",
      grade: (line.grade ?? "").toString().trim() || "A",
      qty,
      unitPriceGbp: Number(line.unitPriceGbp) || 0,
      buyPriceGbp: Number(line.buyPriceGbp) || 0,
      imeis,
      sortOrder: i,
    });
  });
  return normalized;
}

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  listInvoices(status?: string) {
    return this.prisma.invoice.findMany({
      where: status ? { status } : undefined,
      include: { customer: true, lines: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: { orderBy: { sortOrder: "asc" } },
        stockUnits: true,
        shipments: true,
        payments: {
          orderBy: { paidAt: "desc" },
          include: { rma: { select: { id: true, rmaNumber: true } } },
        },
        installments: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async createInvoice(input: CreateInvoiceDto) {
    const customerId = input.customerId;
    const status = input.status ?? "PENDING";
    const lines = normalizeLines(input.lines ?? []);

    if (!customerId) throw new BadRequestException("Select a customer");
    if (!lines.length) throw new BadRequestException("Add at least one line");

    for (const line of lines) {
      if (line.imeis.length > line.qty) {
        throw new BadRequestException(
          `Line ${line.productName}: cannot list more IMEIs than the qty (${line.qty})`,
        );
      }
    }

    const allImeis = lines.flatMap((line) => line.imeis);
    if (new Set(allImeis).size !== allImeis.length) {
      throw new BadRequestException("Duplicate IMEIs on this invoice");
    }

    // Stock levels are not a hard gate here: an invoice can be created even
    // when the product is out of stock or an IMEI isn't recognised yet.
    // Any IMEI that does match a real, available StockUnit is still linked
    // below for inventory tracking (best effort, never blocking).
    const units = allImeis.length
      ? await this.prisma.stockUnit.findMany({ where: { imei: { in: allImeis } } })
      : [];

    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await nextNumberTx(tx, "INV_UK", "", "");
      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          status,
          shippingCostGbp: Number(input.shippingCostGbp) || 0,
          shippingLabel: input.shippingLabel ?? null,
          paymentTerms: input.paymentTerms ?? "Immediate",
          warrantyTerms: input.warrantyTerms ?? "3 months",
          marginVatScheme: input.marginVatScheme ?? true,
          notes: input.notes ?? null,
          paidAt: status === "PAID" ? new Date() : null,
          lines: {
            create: lines.map((line) => ({
              qty: line.qty,
              productName: line.productName,
              color: line.color,
              network: line.network,
              grade: line.grade,
              unitPriceGbp: line.unitPriceGbp,
              buyPriceGbp: line.buyPriceGbp,
              imeis: line.imeis,
              sortOrder: line.sortOrder,
            })),
          },
        },
        include: { lines: true },
      });

      const unitByImei = new Map(units.map((unit) => [unit.imei, unit]));
      const nextStatus = stockStatusForInvoice(status);
      for (const line of created.lines) {
        const source = lines[line.sortOrder];
        for (const imei of source.imeis) {
          const unit = unitByImei.get(imei);
          // Best effort only: an IMEI with no matching stock unit, or one
          // that isn't currently IN_STOCK, is still saved on the line but
          // simply isn't linked for inventory tracking.
          if (!unit || unit.status !== "IN_STOCK") continue;
          await tx.stockUnit.update({
            where: { id: unit.id },
            data: { status: nextStatus, invoiceId: created.id, invoiceLineId: line.id },
          });
        }
      }

      // Either shape is accepted: bare ids apply the whole balance, pairs apply a part-amount.
      const requestedCredits = [
        ...(input.appliedRmaCredits ?? []).filter((credit) => credit?.rmaId),
        ...(input.appliedRmaIds ?? [])
          .filter(Boolean)
          .map((rmaId) => ({ rmaId, amountGbp: undefined })),
      ];
      const seenRmaIds = new Set<string>();
      for (const credit of requestedCredits) {
        if (seenRmaIds.has(credit.rmaId)) continue;
        seenRmaIds.add(credit.rmaId);
        const rma = await tx.rma.findUnique({
          where: { id: credit.rmaId },
          include: { items: true, payments: true },
        });
        if (!rma || rma.customerId !== customerId || rma.paymentType !== "PENDING") continue;
        const remaining = rmaRemainingCredit(rma);
        if (remaining <= 0) continue;
        const requested = Number(credit.amountGbp);
        const amountGbp = requested > 0 ? Math.min(requested, remaining) : remaining;
        await recordPaymentTx(tx, created.id, {
          amountGbp,
          rmaId: rma.id,
          method: "RMA credit",
        });
      }

      if (input.initialPaymentGbp && input.initialPaymentGbp > 0) {
        await recordPaymentTx(tx, created.id, { amountGbp: input.initialPaymentGbp });
      }

      if (input.installmentCount && input.installmentCount >= 2) {
        const current = await tx.invoice.findUniqueOrThrow({
          where: { id: created.id },
          include: { lines: true },
        });
        const totals = invoiceTotals(current);
        if (totals.dueGbp > 0) {
          const rows = buildEvenInstallments(
            totals.dueGbp,
            input.installmentCount,
            input.installmentStartDate ? new Date(input.installmentStartDate) : current.issuedAt,
            input.installmentIntervalDays ?? 30,
          );
          await tx.installment.createMany({
            data: rows.map((row) => ({
              invoiceId: created.id,
              dueDate: row.dueDate,
              amountGbp: row.amountGbp,
              sortOrder: row.sortOrder,
            })),
          });
        }
      }

      return created;
    }, { timeout: 15000 });
  }

  async updateInvoiceStatus(id: string, status: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { stockUnits: true },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: { status, paidAt: status === "PAID" ? new Date() : null },
      });
      for (const unit of invoice.stockUnits) {
        if (unit.status === "RMA" || unit.status === "FAULTY") continue;
        if (status === "CANCELLED") {
          // Voiding an invoice releases its reserved/sold stock back to
          // available inventory, as if the sale never happened.
          await tx.stockUnit.update({
            where: { id: unit.id },
            data: { status: "IN_STOCK", invoiceId: null, invoiceLineId: null },
          });
        } else {
          await tx.stockUnit.update({
            where: { id: unit.id },
            data: { status: stockStatusForInvoice(status) },
          });
        }
      }
      return updated;
    });
  }

  async updateInvoiceShipping(id: string, dto: UpdateInvoiceShippingDto) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException("Invoice not found");

    return this.prisma.invoice.update({
      where: { id },
      data: {
        shippingCostGbp: Number(dto.shippingCostGbp) || 0,
        shippingLabel: dto.shippingLabel?.toString().trim() || null,
      },
    });
  }

  async updateInvoiceMarginVat(id: string, dto: UpdateInvoiceMarginVatDto) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException("Invoice not found");

    return this.prisma.invoice.update({
      where: { id },
      data: { marginVatScheme: dto.marginVatScheme },
    });
  }

  async addInvoiceLine(invoiceId: string, dto: UpdateInvoiceLineDto) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException("Invoice not found");

    const productName = (dto.productName ?? "").trim();
    const qty = Number(dto.qty) || 0;
    if (!productName) throw new BadRequestException("Product name is required");
    if (qty <= 0) throw new BadRequestException("Qty must be greater than 0");

    const last = await this.prisma.invoiceLine.aggregate({
      where: { invoiceId },
      _max: { sortOrder: true },
    });

    return this.prisma.invoiceLine.create({
      data: {
        invoiceId,
        productName,
        color: (dto.color ?? "").toString().trim() || "Black",
        network: (dto.network ?? "").toString().trim() || "Unlocked",
        grade: (dto.grade ?? "").toString().trim() || "A",
        qty,
        unitPriceGbp: Number(dto.unitPriceGbp) || 0,
        buyPriceGbp: Number(dto.buyPriceGbp) || 0,
        imeis: [],
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateInvoiceLine(invoiceId: string, lineId: string, dto: UpdateInvoiceLineDto) {
    const line = await this.prisma.invoiceLine.findUnique({ where: { id: lineId } });
    if (!line || line.invoiceId !== invoiceId) throw new NotFoundException("Invoice line not found");

    const productName = (dto.productName ?? "").trim();
    const qty = Number(dto.qty) || 0;
    if (!productName) throw new BadRequestException("Product name is required");
    if (qty <= 0) throw new BadRequestException("Qty must be greater than 0");
    if (line.imeis.length > qty) {
      throw new BadRequestException(
        `Cannot set qty below the number of IMEIs already listed on this line (${line.imeis.length}). Remove IMEIs first.`,
      );
    }

    return this.prisma.invoiceLine.update({
      where: { id: lineId },
      data: {
        productName,
        color: (dto.color ?? "").toString().trim() || "Black",
        network: (dto.network ?? "").toString().trim() || "Unlocked",
        grade: (dto.grade ?? "").toString().trim() || "A",
        qty,
        unitPriceGbp: Number(dto.unitPriceGbp) || 0,
        buyPriceGbp: Number(dto.buyPriceGbp) || 0,
      },
    });
  }

  async updateInvoiceLineImeis(invoiceId: string, lineId: string, imeis: string[]) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException("Invoice not found");
    const line = await this.prisma.invoiceLine.findUnique({ where: { id: lineId } });
    if (!line || line.invoiceId !== invoiceId) throw new NotFoundException("Invoice line not found");

    const cleaned = Array.from(new Set(imeis.map((imei) => imei.trim()).filter(Boolean)));
    if (cleaned.length > line.qty) {
      throw new BadRequestException(`Cannot list more IMEIs than the qty (${line.qty})`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Release any previously linked stock units that are no longer on this line.
      await tx.stockUnit.updateMany({
        where: { invoiceLineId: lineId, imei: { notIn: cleaned } },
        data: { status: "IN_STOCK", invoiceId: null, invoiceLineId: null },
      });

      const updated = await tx.invoiceLine.update({
        where: { id: lineId },
        data: { imeis: cleaned },
      });

      // Best effort link: only IMEIs matching a real, IN_STOCK unit get tied
      // to this invoice for inventory tracking; anything else is still saved
      // as plain text on the line.
      if (cleaned.length) {
        const units = await tx.stockUnit.findMany({ where: { imei: { in: cleaned } } });
        const nextStatus = stockStatusForInvoice(invoice.status);
        for (const unit of units) {
          if (unit.status !== "IN_STOCK") continue;
          await tx.stockUnit.update({
            where: { id: unit.id },
            data: { status: nextStatus, invoiceId, invoiceLineId: lineId },
          });
        }
      }

      return updated;
    });
  }

  async sendInvoiceEmail(id: string, dto: SendInvoiceEmailDto) {
    const invoice = await this.getInvoice(id);
    const to = dto.email?.trim() || invoice.customer.email;
    if (!to) {
      throw new BadRequestException(
        "No email address on file for this customer. Provide one to send to.",
      );
    }

    const { currency, rate } = resolvePrintCurrency(dto.currency, dto.rate);
    const pdf = await buildInvoicePdf(invoice, { currency, rate });
    const totals = invoiceTotals(invoice);
    const money = (gbp: number) => formatMoney(gbp, currency, rate);

    const html = `
      <p>Dear ${invoice.customer.name},</p>
      <p>Please find attached your invoice <strong>${invoice.invoiceNumber}</strong>.</p>
      <p>
        Grand total: <strong>${money(totals.totalGbp)}</strong><br />
        Payment due: <strong>${money(totals.dueGbp)}</strong>
      </p>
      ${dto.message ? `<p>${dto.message.replace(/\n/g, "<br />")}</p>` : ""}
      <p>Thank you for your business.</p>
    `.trim();

    await this.mail.sendMail({
      to,
      subject: `Invoice ${invoice.invoiceNumber}`,
      html,
      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });

    return { sentTo: to };
  }

  async recordPayment(invoiceId: string, dto: RecordPaymentDto) {
    return this.prisma.$transaction((tx) =>
      recordPaymentTx(tx, invoiceId, {
        amountGbp: dto.amountGbp,
        method: dto.method,
        notes: dto.notes,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        rmaId: dto.rmaId,
      }),
    );
  }

  async updatePayment(invoiceId: string, paymentId: string, dto: UpdatePaymentDto) {
    return this.prisma.$transaction((tx) =>
      updatePaymentTx(tx, invoiceId, paymentId, {
        amountGbp: dto.amountGbp,
        method: dto.method,
        notes: dto.notes,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
      }),
    );
  }

  async createInstallmentPlan(invoiceId: string, dto: CreateInstallmentPlanDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    if (invoice.status === "CANCELLED") {
      throw new BadRequestException("Cannot schedule installments on a cancelled invoice");
    }

    const totals = invoiceTotals(invoice);
    if (totals.dueGbp <= 0) {
      throw new BadRequestException("This invoice has no remaining balance to schedule");
    }

    const rows = buildEvenInstallments(
      totals.dueGbp,
      dto.count,
      dto.startDate ? new Date(dto.startDate) : new Date(),
      dto.intervalDays ?? 30,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.installment.deleteMany({ where: { invoiceId, status: "PENDING" } });
      await tx.installment.createMany({
        data: rows.map((row) => ({
          invoiceId,
          dueDate: row.dueDate,
          amountGbp: row.amountGbp,
          sortOrder: row.sortOrder,
        })),
      });
      return tx.installment.findMany({ where: { invoiceId }, orderBy: { sortOrder: "asc" } });
    });
  }

  async payInstallment(invoiceId: string, installmentId: string, dto: PayInstallmentDto) {
    const installment = await this.prisma.installment.findUnique({ where: { id: installmentId } });
    if (!installment || installment.invoiceId !== invoiceId) {
      throw new NotFoundException("Installment not found");
    }
    if (installment.status === "PAID") {
      throw new BadRequestException("This installment is already paid");
    }

    return this.prisma.$transaction((tx) =>
      recordPaymentTx(tx, invoiceId, {
        amountGbp: dto.amountGbp ?? installment.amountGbp,
        method: dto.method,
        notes: dto.notes,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        installmentId,
      }),
    );
  }
}
