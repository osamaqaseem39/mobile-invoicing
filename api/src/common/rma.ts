import { roundMoney } from "./money";

export function rmaTotals(rma: { items: { unitPriceGbp: number }[] }) {
  const totalGbp = roundMoney(rma.items.reduce((sum, item) => sum + item.unitPriceGbp, 0));
  return { totalGbp };
}

export function rmaRemainingCredit(rma: {
  items: { unitPriceGbp: number }[];
  payments: { amountGbp: number }[];
}) {
  const consumedGbp = roundMoney(rma.payments.reduce((sum, payment) => sum + payment.amountGbp, 0));
  return roundMoney(rmaTotals(rma).totalGbp - consumedGbp);
}

/**
 * The three figures shown against every credit note: what it is worth, how much
 * has been applied to invoices so far, and what is left to spend.
 */
export function rmaCreditSummary(rma: {
  items: { unitPriceGbp: number }[];
  payments: { amountGbp: number }[];
  paymentType?: string;
}) {
  const totalGbp = rmaTotals(rma).totalGbp;
  const appliedGbp = roundMoney(rma.payments.reduce((sum, payment) => sum + payment.amountGbp, 0));
  const remainingGbp = roundMoney(totalGbp - appliedGbp);
  // Only a PENDING credit can still be spent — recordPaymentTx and the credit
  // pickers both refuse anything else, so a settled note's balance is not available
  // even when its payment rows don't add up to its total (older administrative
  // status changes closed a credit without recording a payment).
  const settled = rma.paymentType !== undefined && rma.paymentType !== "PENDING";
  return {
    totalGbp,
    appliedGbp,
    remainingGbp,
    settled,
    availableGbp: settled ? 0 : Math.max(remainingGbp, 0),
  };
}

export function groupRmaSummary(
  items: {
    stockUnit: { productName: string; color: string; grade: string } | null;
    productName?: string | null;
    color?: string | null;
    grade?: string | null;
  }[],
) {
  const groups = new Map<string, { productName: string; color: string; grade: string; qty: number }>();
  for (const item of items) {
    const productName = item.stockUnit?.productName ?? item.productName ?? "Unknown item";
    const color = item.stockUnit?.color ?? item.color ?? "";
    const grade = item.stockUnit?.grade ?? item.grade ?? "";
    const key = `${productName}__${color}__${grade}`;
    const existing = groups.get(key);
    if (existing) {
      existing.qty += 1;
    } else {
      groups.set(key, { productName, color, grade, qty: 1 });
    }
  }
  return Array.from(groups.values());
}
