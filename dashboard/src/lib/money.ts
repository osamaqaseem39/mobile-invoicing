export const DEFAULT_GBP_TO_EUR_RATE = 1.15;

export type PrintCurrency = "GBP" | "EUR";

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

/** Formats a GBP amount in the chosen print currency, converting at `rate` for EUR. */
export function formatMoney(amountGbp: number, currency: PrintCurrency, rate: number) {
  return currency === "EUR" ? formatEur(amountGbp * rate) : formatGbp(amountGbp);
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
