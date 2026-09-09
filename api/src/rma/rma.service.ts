import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { recordPaymentTx } from "../common/payments";
import { nextNumberTx } from "../common/numbers";
import { stockStatusForInvoice } from "../common/invoice";
import { ApplyRmaCreditDto, CreateRmaDto } from "./dto/rma.dto";

@Injectable()
export class RmaService {
  constructor(private prisma: PrismaService) {}

  listRmas(customerId?: string) {
    return this.prisma.rma.findMany({
      where: customerId ? { customerId } : undefined,
      include: { customer: true, invoice: true, items: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getRma(id: string) {
    const rma = await this.prisma.rma.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: true,
        appliedInvoice: true,
        items: { include: { stockUnit: true } },
        payments: { include: { invoice: { select: { id: true, invoiceNumber: true } } } },
      },
    });
    if (!rma) throw new NotFoundException("RMA not found");
    return rma;
  }

  async createRma(input: CreateRmaDto) {
    const invoiceId = input.invoiceId;
    const reason = input.reason ?? null;
    const items = input.items ?? [];
    const unitIds = items.map((item) => item.stockUnitId).filter(Boolean);
    const manualItems = (input.manualItems ?? []).filter((item) =>
      (item.productName ?? "").trim(),
    );

    if (!invoiceId || (!unitIds.length && !manualItems.length)) {
      throw new BadRequestException("Select an invoice and at least one IMEI or manual item");
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { stockUnits: { include: { invoiceLine: true } }, customer: true },
    });
    if (!invoice) throw new BadRequestException("Invoice not found");

    const allowed = new Set(invoice.stockUnits.map((unit) => unit.id));
    if (unitIds.some((id) => !allowed.has(id))) {
      throw new BadRequestException("IMEI does not belong to this invoice");
    }

    const unitById = new Map(invoice.stockUnits.map((unit) => [unit.id, unit]));
    const itemByUnitId = new Map(items.map((item) => [item.stockUnitId, item]));

    return this.prisma.$transaction(async (tx) => {
      const rmaNumber = await nextNumberTx(tx, "RMA_UK", "", "");
      const created = await tx.rma.create({
        data: {
          rmaNumber,
          invoiceId,
          customerId: invoice.customerId,
          reason,
          notes: input.notes ?? null,
          status: "OPEN",
          items: {
            create: [
              ...unitIds.map((stockUnitId) => {
                const unit = unitById.get(stockUnitId);
                const item = itemByUnitId.get(stockUnitId);
                return {
                  stockUnitId,
                  invoiceNumber: invoice.invoiceNumber,
                  action: item?.action || "RESTOCK",
                  reason: item?.reason ?? null,
                  unitPriceGbp: unit?.invoiceLine?.unitPriceGbp ?? 0,
                };
              }),
              ...manualItems.map((item) => ({
                invoiceNumber: (item.invoiceNumber ?? "").trim() || invoice.invoiceNumber,
                productName: (item.productName ?? "").trim(),
                imei: (item.imei ?? "").trim() || null,
                color: (item.color ?? "").trim() || null,
                grade: (item.grade ?? "").trim() || null,
                action: item.action || "RESTOCK",
                reason: item.reason ?? null,
                unitPriceGbp: Number(item.unitPriceGbp) || 0,
              })),
            ],
          },
        },
      });
      if (unitIds.length) {
        await tx.stockUnit.updateMany({ where: { id: { in: unitIds } }, data: { status: "RMA" } });
      }
      return created;
    });
  }

  async applyRmaCredit(rmaId: string, input: ApplyRmaCreditDto) {
    if (!rmaId) throw new NotFoundException("RMA not found");
    const paymentType = input.paymentType ?? "PENDING";
    const appliedInvoiceId = input.appliedInvoiceId || null;
    const paymentAmountGbp = Number(input.paymentAmountGbp) || 0;
    const paymentDateRaw = input.paymentDate || null;

    if (paymentType === "APPLIED_TO_INVOICE") {
      if (!appliedInvoiceId) {
        throw new BadRequestException("Select an invoice to apply the credit to");
      }
      if (paymentAmountGbp <= 0) {
        throw new BadRequestException("Enter an amount to apply");
      }
      return this.prisma.$transaction((tx) =>
        recordPaymentTx(tx, appliedInvoiceId, {
          amountGbp: paymentAmountGbp,
          rmaId,
          method: "RMA credit",
          paidAt: paymentDateRaw ? new Date(paymentDateRaw) : undefined,
        }),
      );
    }

    // PENDING (reset) or REFUNDED: administrative status change only, no invoice/payment side effects.
    return this.prisma.rma.update({
      where: { id: rmaId },
      data: {
        paymentType,
        paymentDate: paymentDateRaw ? new Date(paymentDateRaw) : new Date(),
        paymentAmountGbp,
        appliedInvoiceId: null,
      },
    });
  }

  async processRma(id: string, status: string) {
    const rma = await this.prisma.rma.findUnique({
      where: { id },
      include: { items: { include: { stockUnit: true } } },
    });
    if (!rma) throw new NotFoundException("RMA not found");

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.rma.update({ where: { id }, data: { status } });
      if (status === "RECEIVED" || status === "CLOSED" || status === "REFUNDED") {
        for (const item of rma.items) {
          if (!item.stockUnitId) continue;
          const data: { status: string; invoiceId?: null; invoiceLineId?: null } = { status: "RMA" };
          if (item.action === "RESTOCK") {
            data.status = "IN_STOCK";
            data.invoiceId = null;
            data.invoiceLineId = null;
          } else {
            data.status = "FAULTY";
          }
          await tx.stockUnit.update({ where: { id: item.stockUnitId }, data });
        }
      }
      return updated;
    });
  }

  async deleteRma(id: string) {
    const rma = await this.prisma.rma.findUnique({
      where: { id },
      include: { items: true, invoice: { select: { status: true, lines: true } } },
    });
    if (!rma) throw new NotFoundException("RMA not found");

    const payments = await this.prisma.payment.count({ where: { rmaId: id } });
    if (payments > 0) {
      throw new ConflictException(
        "This credit is applied to an invoice — remove those payments before deleting the RMA",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Creating and processing an RMA pulls units out of the sale (RMA,
      // FAULTY, or back to IN_STOCK). Deleting it puts each one back on the
      // invoice it was sold on, as if the return had never been raised.
      const cancelled = rma.invoice.status === "CANCELLED";
      for (const item of rma.items) {
        if (!item.stockUnitId) continue;
        // A cancelled invoice already released its stock, so there is nothing
        // to put the unit back onto — it stays available.
        if (cancelled) {
          await tx.stockUnit.update({
            where: { id: item.stockUnitId },
            data: { status: "IN_STOCK", invoiceId: null, invoiceLineId: null },
          });
          continue;
        }
        const unit = await tx.stockUnit.findUnique({ where: { id: item.stockUnitId } });
        if (!unit) continue;
        const line = rma.invoice.lines.find(
          (candidate) => unit.imei && candidate.imeis.includes(unit.imei),
        );
        await tx.stockUnit.update({
          where: { id: item.stockUnitId },
          data: {
            status: stockStatusForInvoice(rma.invoice.status),
            invoiceId: rma.invoiceId,
            invoiceLineId: line?.id ?? unit.invoiceLineId,
          },
        });
      }
      await tx.rmaItem.deleteMany({ where: { rmaId: id } });
      await tx.rma.delete({ where: { id } });
      return { deleted: true };
    });
  }
}
