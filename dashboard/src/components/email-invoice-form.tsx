import { sendInvoiceEmail } from "@/actions/invoices";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { PrintCurrency } from "@/lib/money";

export function EmailInvoiceForm({
  invoiceId,
  customerEmail,
  returnTo,
  currency = "GBP",
  rate,
}: {
  invoiceId: string;
  customerEmail: string | null;
  returnTo: string;
  /** Currency the attached PDF is rendered in — mirrors the print-currency picker. */
  currency?: PrintCurrency;
  rate?: number;
}) {
  return (
    <form action={sendInvoiceEmail} className="flex items-end gap-2">
      <input type="hidden" name="id" value={invoiceId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="currency" value={currency} />
      {currency === "EUR" && rate ? <input type="hidden" name="rate" value={rate} /> : null}
      <div>
        <Input
          name="email"
          type="email"
          required
          defaultValue={customerEmail ?? ""}
          placeholder="customer@example.com"
          className="h-10 w-56"
        />
      </div>
      <SubmitButton pendingText="Sending…" size="md" variant="secondary">
        {currency === "EUR" ? "Email invoice (EUR)" : "Email invoice"}
      </SubmitButton>
    </form>
  );
}
