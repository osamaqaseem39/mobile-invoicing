import { roundMoney } from "@/lib/money";

export function invoiceTotals(invoice: {
  shippingCostGbp: number;
  paidAmountGbp?: number;
  lines: { qty: number; unitPriceGbp: number }[];
}) {
  const subGbp = roundMoney(
    invoice.lines.reduce((sum, line) => sum + line.qty * line.unitPriceGbp, 0),
  );
  const totalGbp = roundMoney(subGbp + invoice.shippingCostGbp);
  const paidGbp = roundMoney(invoice.paidAmountGbp ?? 0);
  return {
    subGbp,
    shippingGbp: invoice.shippingCostGbp,
    totalGbp,
    paidGbp,
    dueGbp: roundMoney(totalGbp - paidGbp),
  };
}

/**
 * What the invoice actually earned. Shipping is deliberately left out of both
 * sides: what the customer is charged for it has no buying price to net off
 * against, so folding it in would overstate the profit.
 */
export function invoiceProfit(invoice: {
  lines: { qty: number; unitPriceGbp: number; buyPriceGbp?: number }[];
}) {
  const salesGbp = roundMoney(
    invoice.lines.reduce((sum, line) => sum + line.qty * line.unitPriceGbp, 0),
  );
  const costGbp = roundMoney(
    invoice.lines.reduce((sum, line) => sum + line.qty * (line.buyPriceGbp ?? 0), 0),
  );
  const profitGbp = roundMoney(salesGbp - costGbp);
  return {
    salesGbp,
    costGbp,
    profitGbp,
    // With no cost entered the margin would read as a flat 100%, which is a
    // lie rather than a number, so it is reported as unknown instead.
    profitPct: salesGbp > 0 && costGbp > 0 ? (profitGbp / salesGbp) * 100 : null,
  };
}
