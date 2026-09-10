import type { Prisma } from "@prisma/client";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { invoiceTotals } from "./invoice";
import { roundMoney } from "./money";
import { rmaRemainingCredit, rmaTotals } from "./rma";

const EPSILON_GBP = 0.005;

export async function recordPaymentTx(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  input: {
    amountGbp: number;
    method?: string | null;
    notes?: string | null;
    paidAt?: Date;
    installmentId?: string;
    rmaId?: string;
  },
) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  });
  if (!invoice) throw new NotFoundException("Invoice not found");
  if (invoice.status === "CANCELLED") {
    throw new BadRequestException("Cannot record a payment on a cancelled invoice");
  }

  let rmaRemainingAfter: number | null = null;
  if (input.rmaId) {
    const rma = await tx.rma.findUnique({
      where: { id: input.rmaId },
      include: { items: true, payments: true },
    });
    if (!rma) throw new NotFoundException("RMA not found");
    if (rma.customerId !== invoice.customerId) {
      throw new BadRequestException("This RMA credit belongs to a different customer");
    }
    if (rma.paymentType !== "PENDING") {
      throw new BadRequestException("This RMA credit has already been fully applied");
    }
    const remaining = rmaRemainingCredit(rma);
    if (input.amountGbp > remaining + EPSILON_GBP) {
      throw new BadRequestException(
        `Amount exceeds the RMA's remaining credit (${remaining.toFixed(2)} left)`,
      );
    }
    rmaRemainingAfter = roundMoney(remaining - input.amountGbp);
  }

  const payment = await tx.payment.create({
    data: {
      invoiceId,
      amountGbp: roundMoney(input.amountGbp),
      method: input.method ?? null,
      notes: input.notes ?? null,
      paidAt: input.paidAt ?? new Date(),
      installmentId: input.installmentId,
      rmaId: input.rmaId,
    },
  });

  const newPaidGbp = roundMoney(invoice.paidAmountGbp + input.amountGbp);
  const totals = invoiceTotals({ ...invoice, paidAmountGbp: newPaidGbp });
  const nextStatus =
    totals.dueGbp <= 0 ? "PAID" : invoice.status === "PENDING" ? "AWAITING_PAYMENT" : invoice.status;

  const updatedInvoice = await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmountGbp: newPaidGbp,
      status: nextStatus,
      paidAt: nextStatus === "PAID" ? new Date() : invoice.paidAt,
    },
  });

  if (input.installmentId) {
    await tx.installment.update({
      where: { id: input.installmentId },
      data: { status: "PAID" },
    });
  }

  if (input.rmaId && rmaRemainingAfter !== null) {
    const consumedSoFar = await tx.payment.aggregate({
      where: { rmaId: input.rmaId },
      _sum: { amountGbp: true },
    });
    const update: Prisma.RmaUpdateInput = {
      paymentAmountGbp: roundMoney(consumedSoFar._sum.amountGbp ?? 0),
    };
    if (rmaRemainingAfter <= EPSILON_GBP) {
      update.paymentType = "APPLIED_TO_INVOICE";
      update.paymentDate = new Date();
      update.appliedInvoice = { connect: { id: invoiceId } };
    }
    await tx.rma.update({ where: { id: input.rmaId }, data: update });
  }

  return { payment, invoice: updatedInvoice };
}

export async function updatePaymentTx(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  paymentId: string,
  input: {
    amountGbp?: number;
    method?: string | null;
    notes?: string | null;
    paidAt?: Date;
  },
) {
  const payment = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.invoiceId !== invoiceId) {
    throw new NotFoundException("Payment not found");
  }

  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  });
  if (!invoice) throw new NotFoundException("Invoice not found");
  if (invoice.status === "CANCELLED") {
    throw new BadRequestException("Cannot edit a payment on a cancelled invoice");
  }

  const newAmountGbp =
    input.amountGbp !== undefined ? roundMoney(input.amountGbp) : payment.amountGbp;

  if (payment.rmaId && newAmountGbp !== payment.amountGbp) {
    const rma = await tx.rma.findUnique({
      where: { id: payment.rmaId },
      include: { items: true, payments: true },
    });
    if (rma) {
      const remainingExcludingSelf = roundMoney(rmaRemainingCredit(rma) + payment.amountGbp);
      if (newAmountGbp > remainingExcludingSelf + EPSILON_GBP) {
        throw new BadRequestException(
          `Amount exceeds the RMA's remaining credit (${remainingExcludingSelf.toFixed(2)} available)`,
        );
      }
    }
  }

  const updatedPayment = await tx.payment.update({
    where: { id: paymentId },
    data: {
      amountGbp: newAmountGbp,
      method: input.method !== undefined ? input.method : payment.method,
      notes: input.notes !== undefined ? input.notes : payment.notes,
      paidAt: input.paidAt ?? payment.paidAt,
    },
  });

  const newPaidGbp = roundMoney(invoice.paidAmountGbp - payment.amountGbp + newAmountGbp);
  const totals = invoiceTotals({ ...invoice, paidAmountGbp: newPaidGbp });
  const nextStatus = totals.dueGbp <= 0 ? "PAID" : newPaidGbp > 0 ? "AWAITING_PAYMENT" : "PENDING";

  const updatedInvoice = await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmountGbp: newPaidGbp,
      status: nextStatus,
      paidAt: nextStatus === "PAID" ? new Date() : null,
    },
  });

  if (payment.rmaId) {
    const consumedSoFar = await tx.payment.aggregate({
      where: { rmaId: payment.rmaId },
      _sum: { amountGbp: true },
    });
    const rma = await tx.rma.findUnique({ where: { id: payment.rmaId }, include: { items: true } });
    if (rma) {
      const totalConsumed = roundMoney(consumedSoFar._sum.amountGbp ?? 0);
      const remaining = roundMoney(rmaTotals(rma).totalGbp - totalConsumed);
      await tx.rma.update({
        where: { id: payment.rmaId },
        data: {
          paymentAmountGbp: totalConsumed,
          paymentType: remaining <= EPSILON_GBP ? "APPLIED_TO_INVOICE" : "PENDING",
        },
      });
    }
  }

  return { payment: updatedPayment, invoice: updatedInvoice };
}

/**
 * Removes a payment and unwinds everything it touched: the invoice's paid total
 * and status, the installment it settled, and — for an RMA credit — the credit
 * it consumed, which becomes spendable again.
 */
export async function deletePaymentTx(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  paymentId: string,
) {
  const payment = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.invoiceId !== invoiceId) {
    throw new NotFoundException("Payment not found");
  }

  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  });
  if (!invoice) throw new NotFoundException("Invoice not found");
  if (invoice.status === "CANCELLED") {
    throw new BadRequestException("Cannot delete a payment on a cancelled invoice");
  }

  await tx.payment.delete({ where: { id: paymentId } });

  // The installment this settled goes back to unpaid so it can be paid again.
  if (payment.installmentId) {
    await tx.installment.update({
      where: { id: payment.installmentId },
      data: { status: "PENDING" },
    });
  }

  const newPaidGbp = roundMoney(invoice.paidAmountGbp - payment.amountGbp);
  const totals = invoiceTotals({ ...invoice, paidAmountGbp: newPaidGbp });
  const nextStatus = totals.dueGbp <= 0 ? "PAID" : newPaidGbp > 0 ? "AWAITING_PAYMENT" : "PENDING";

  const updatedInvoice = await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmountGbp: newPaidGbp,
      status: nextStatus,
      paidAt: nextStatus === "PAID" ? (invoice.paidAt ?? new Date()) : null,
    },
  });

  if (payment.rmaId) {
    // The row is already gone, so what is left on the RMA is the new truth.
    const rma = await tx.rma.findUnique({
      where: { id: payment.rmaId },
      include: { items: true, payments: true },
    });
    if (rma) {
      const totalConsumed = roundMoney(
        rma.payments.reduce((sum, row) => sum + row.amountGbp, 0),
      );
      const exhausted = roundMoney(rmaTotals(rma).totalGbp - totalConsumed) <= EPSILON_GBP;
      const data: Prisma.RmaUpdateInput = {
        paymentAmountGbp: totalConsumed,
        paymentType: exhausted ? "APPLIED_TO_INVOICE" : "PENDING",
        paymentDate: exhausted ? rma.paymentDate : null,
      };
      // appliedInvoiceId points at the last invoice the credit was spent on;
      // it is stale once none of this credit sits on that invoice any more.
      if (
        rma.appliedInvoiceId === invoiceId &&
        !rma.payments.some((row) => row.invoiceId === invoiceId)
      ) {
        data.appliedInvoice = { disconnect: true };
      }
      await tx.rma.update({ where: { id: payment.rmaId }, data });
    }
  }

  return { invoice: updatedInvoice };
}

export function buildEvenInstallments(
  remainingGbp: number,
  count: number,
  startDate: Date,
  intervalDays: number,
) {
  const base = Math.floor((remainingGbp / count) * 100) / 100;
  const rows: { dueDate: Date; amountGbp: number; sortOrder: number }[] = [];
  let allocated = 0;
  for (let i = 0; i < count; i += 1) {
    const isLast = i === count - 1;
    const amount = isLast ? roundMoney(remainingGbp - allocated) : base;
    allocated = roundMoney(allocated + amount);
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + i * intervalDays);
    rows.push({ dueDate, amountGbp: amount, sortOrder: i });
  }
  return rows;
}
