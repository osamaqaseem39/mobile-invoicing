export const DEFAULT_GBP_TO_EUR_RATE = 1.15;

export type PrintCurrency = "GBP" | "EUR";

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatGbp(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(amount));
}

export function formatEur(amount: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(amount));
}

/** Formats a GBP amount in the chosen currency, converting at `rate` for EUR. */
export function formatMoney(amountGbp: number, currency: PrintCurrency, rate: number) {
  return currency === "EUR" ? formatEur(amountGbp * rate) : formatGbp(amountGbp);
}

/** Normalises untrusted currency/rate input into a usable pair. */
export function resolvePrintCurrency(currency?: string, rate?: number) {
  const resolved: PrintCurrency = currency === "EUR" ? "EUR" : "GBP";
  const resolvedRate = typeof rate === "number" && rate > 0 ? rate : DEFAULT_GBP_TO_EUR_RATE;
  return { currency: resolved, rate: resolvedRate };
}
