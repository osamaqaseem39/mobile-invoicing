import { notFound } from "next/navigation";
import { CurrencyPrintControls } from "@/components/currency-print-controls";
import { EmailInvoiceForm } from "@/components/email-invoice-form";
import { InvoiceDocument, type InvoiceDoc } from "@/components/invoice-document";
import { Notice } from "@/components/notice";
import { PrintButton } from "@/components/print-button";
import { requireUser } from "@/lib/auth-guard";
import { apiClient, ApiError } from "@/lib/api-client";
import { DEFAULT_GBP_TO_EUR_RATE, type PrintCurrency } from "@/lib/money";

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; currency?: string; rate?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { id } = await params;
  const { ok, error, currency: currencyParam, rate: rateParam } = await searchParams;
  const currency: PrintCurrency = currencyParam === "EUR" ? "EUR" : "GBP";
  const rate = Number(rateParam) > 0 ? Number(rateParam) : DEFAULT_GBP_TO_EUR_RATE;
  const printPath = `/invoices/${id}/print`;
  // Keep the chosen currency on the page after the email action redirects back.
  const returnTo = currency === "EUR" ? `${printPath}?currency=EUR&rate=${rate}` : printPath;
  let invoice: InvoiceDoc;
  try {
    invoice = await apiClient.get<InvoiceDoc>(`/invoices/${id}`, apiToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div>
      <div className="no-print mb-4">
        <Notice ok={ok} error={error} />
        <div className="flex flex-wrap items-end gap-3">
          <PrintButton />
          <CurrencyPrintControls currency={currency} rate={rate} basePath={printPath} />
          <EmailInvoiceForm
            invoiceId={invoice.id}
            customerEmail={invoice.customer.email}
            returnTo={returnTo}
            currency={currency}
            rate={rate}
          />
        </div>
      </div>
      <InvoiceDocument invoice={invoice} currency={currency} rate={rate} />
    </div>
  );
}
