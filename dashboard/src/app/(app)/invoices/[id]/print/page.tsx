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
  const printPath = `/invoices/${id}/print`;
  let invoice: InvoiceDoc;
  try {
    invoice = await apiClient.get<InvoiceDoc>(`/invoices/${id}`, apiToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  // The invoice was issued in a currency at creation; the query params are a
  // per-view override for reprinting the same invoice the other way round.
  const issuedCurrency: PrintCurrency = invoice.printCurrency === "EUR" ? "EUR" : "GBP";
  const issuedRate =
    invoice.fxRate && invoice.fxRate > 0 ? invoice.fxRate : DEFAULT_GBP_TO_EUR_RATE;
  const currency: PrintCurrency = currencyParam
    ? currencyParam === "EUR"
      ? "EUR"
      : "GBP"
    : issuedCurrency;
  const rate = Number(rateParam) > 0 ? Number(rateParam) : issuedRate;
  // Keep the chosen currency on the page after the email action redirects back.
  const returnTo = `${printPath}?currency=${currency}${currency === "EUR" ? `&rate=${rate}` : ""}`;

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
