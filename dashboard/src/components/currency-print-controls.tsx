"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DEFAULT_GBP_TO_EUR_RATE, type PrintCurrency } from "@/lib/money";

/**
 * Print-time currency switch. Invoices are always stored in GBP; picking EUR
 * re-renders the document with every amount converted at the entered rate.
 */
export function CurrencyPrintControls({
  currency,
  rate,
  basePath,
}: {
  currency: PrintCurrency;
  rate: number;
  basePath: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rateInput, setRateInput] = useState(String(rate));

  const apply = (nextCurrency: PrintCurrency, nextRate: string) => {
    const params = new URLSearchParams();
    if (nextCurrency === "EUR") {
      params.set("currency", "EUR");
      const parsed = Number(nextRate);
      params.set("rate", String(parsed > 0 ? parsed : DEFAULT_GBP_TO_EUR_RATE));
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
    });
  };

  return (
    <div className="no-print flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="print-currency">Print currency</Label>
        <Select
          id="print-currency"
          value={currency}
          onChange={(event) => apply(event.target.value as PrintCurrency, rateInput)}
        >
          <option value="GBP">GBP — £</option>
          <option value="EUR">EUR — €</option>
        </Select>
      </div>
      {currency === "EUR" ? (
        <div>
          <Label htmlFor="print-rate">Exchange rate (1 GBP = ? EUR)</Label>
          <Input
            id="print-rate"
            type="number"
            step="0.0001"
            min="0"
            className="w-48"
            value={rateInput}
            onChange={(event) => setRateInput(event.target.value)}
            onBlur={() => apply("EUR", rateInput)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        </div>
      ) : null}
      {isPending ? (
        <span className="pb-3 text-xs text-slate-500 dark:text-slate-400">Updating…</span>
      ) : null}
    </div>
  );
}
