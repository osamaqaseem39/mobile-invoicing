import { updateInvoiceLine } from "@/actions/invoices";
import { CompanyBrand } from "@/components/company-brand";
import { addressLines, company } from "@/lib/company";
import { invoiceTotals } from "@/lib/invoice";
import { DEFAULT_GBP_TO_EUR_RATE, formatMoney, type PrintCurrency } from "@/lib/money";
import { INVOICE_INVALID_UNTIL_PAID_NOTICE, INVOICE_MARGIN_NOTICE, INVOICE_TERMS } from "@/lib/terms";
import { formatDate } from "@/lib/utils";
import { labelStatus } from "@/lib/status";

export type InvoiceDoc = {
  id: string;
  invoiceNumber: string;
  status: string;
  issuedAt: Date | string;
  shippingCostGbp: number;
  shippingLabel: string | null;
  paymentTerms: string | null;
  warrantyTerms: string | null;
  marginVatScheme: boolean;
  paidAmountGbp: number;
  notes: string | null;
  customer: {
    clientId: string;
    name: string;
    businessName: string | null;
    phone: string | null;
    email: string | null;
    vatNumber: string | null;
    address: string | null;
    shippingAddress: string | null;
  };
  lines: {
    id: string;
    qty: number;
    productName: string;
    color: string;
    network: string;
    grade: string;
    unitPriceGbp: number;
    buyPriceGbp?: number;
    imeis?: string[];
  }[];
  stockUnits: { imei: string; invoiceLineId: string | null }[];
};

const editableCellClass =
  "w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 outline-none transition hover:border-slate-200 hover:bg-slate-50 focus:border-[#0b3a6e] focus:bg-white focus:ring-2 focus:ring-[#0b3a6e]/10";

export type InvoiceDocLookups = {
  colors: { id: string; name: string }[];
  networks: { id: string; name: string }[];
  grades: { id: string; code: string }[];
};

export function InvoiceDocument({
  invoice,
  editable = false,
  lookups,
  currency = "GBP",
  rate = DEFAULT_GBP_TO_EUR_RATE,
}: {
  invoice: InvoiceDoc;
  editable?: boolean;
  lookups?: InvoiceDocLookups;
  currency?: PrintCurrency;
  rate?: number;
}) {
  const totals = invoiceTotals(invoice);
  const hasShipping = invoice.shippingCostGbp > 0;
  // Amounts are stored in GBP; EUR is a print-time conversion at the entered rate.
  const money = (gbp: number) => formatMoney(gbp, currency, rate);

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-slate-900 print:p-0">
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:justify-between">
        <div>
          <CompanyBrand company={company} />
          <p className="mt-2 text-sm text-slate-600">
            {addressLines(company).join(", ")}
            <br />
            Telephone: {company.phoneDisplay} · Whatsapp: {company.whatsappDisplay}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold">INVOICE</div>
          <div className="mt-2 font-mono text-lg">Invoice No. {invoice.invoiceNumber}</div>
          <div className="text-sm text-slate-600">Order No. {invoice.invoiceNumber}</div>
          <div className="text-sm text-slate-600">Invoice Date {formatDate(invoice.issuedAt)}</div>
          <div className="text-sm text-slate-600">Order Date {formatDate(invoice.issuedAt)}</div>
          <div className="mt-2 text-sm font-medium">Invoice Status: {labelStatus(invoice.status)}</div>
          <div className="text-sm text-slate-600">Client ID: {invoice.customer.clientId}</div>
        </div>
      </div>

      {invoice.marginVatScheme ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {INVOICE_MARGIN_NOTICE}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Billing details</div>
          <div className="mt-1 font-medium">{invoice.customer.name}</div>
          {invoice.customer.businessName ? (
            <div>{invoice.customer.businessName}</div>
          ) : null}
          <div className="text-sm text-slate-600">
            {invoice.customer.address ? <div>{invoice.customer.address}</div> : null}
            {invoice.customer.phone ? <div>{invoice.customer.phone}</div> : null}
            {invoice.customer.email ? <div>{invoice.customer.email}</div> : null}
            {invoice.customer.vatNumber ? <div>VAT Number: {invoice.customer.vatNumber}</div> : null}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Shipping details</div>
          <div className="mt-1 font-medium">{invoice.customer.name}</div>
          {invoice.customer.businessName ? (
            <div>{invoice.customer.businessName}</div>
          ) : null}
          <div className="text-sm text-slate-600">
            {invoice.customer.shippingAddress || invoice.customer.address || "—"}
          </div>
        </div>
        <div className="text-sm text-slate-600">
          {currency === "EUR" ? <div>Exchange rate: 1 GBP = {rate} EUR</div> : null}
          <div>Payment Terms: {invoice.paymentTerms || "Immediate"}</div>
          <div>Warranty Terms: {invoice.warrantyTerms || "3 months"}</div>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-12" />
          <col />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-16" />
          <col className="w-20" />
          <col className="w-24" />
          {editable ? <col className="w-14" /> : null}
        </colgroup>
        <thead>
          <tr className="border-y border-slate-300 text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-2">Qty</th>
            <th className="py-2 pr-2">Product name</th>
            <th className="py-2 pr-2">Color</th>
            <th className="py-2 pr-2">Network</th>
            <th className="py-2 pr-2 text-center">Grade</th>
            <th className="py-2 pr-2 text-right">Unit price</th>
            <th className="py-2 text-right">Total</th>
            {editable ? <th className="no-print py-2 pl-2" /> : null}
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) =>
            editable ? (
              <tr key={line.id} className="border-b border-slate-100">
                <td className="py-1 pr-2">
                  <input
                    form={`line-${line.id}`}
                    name="qty"
                    type="number"
                    min={1}
                    defaultValue={line.qty}
                    className={editableCellClass}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    form={`line-${line.id}`}
                    name="productName"
                    defaultValue={line.productName}
                    className={editableCellClass}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    form={`line-${line.id}`}
                    name="color"
                    list={`doc-colors-${line.id}`}
                    defaultValue={line.color}
                    className={`${editableCellClass} pr-4`}
                  />
                  {lookups ? (
                    <datalist id={`doc-colors-${line.id}`}>
                      {lookups.colors.map((c) => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                  ) : null}
                </td>
                <td className="py-1 pr-2">
                  <input
                    form={`line-${line.id}`}
                    name="network"
                    list={`doc-networks-${line.id}`}
                    defaultValue={line.network}
                    className={`${editableCellClass} pr-4`}
                  />
                  {lookups ? (
                    <datalist id={`doc-networks-${line.id}`}>
                      {lookups.networks.map((n) => (
                        <option key={n.id} value={n.name} />
                      ))}
                    </datalist>
                  ) : null}
                </td>
                <td className="py-1 pr-2">
                  <input
                    form={`line-${line.id}`}
                    name="grade"
                    list={`doc-grades-${line.id}`}
                    defaultValue={line.grade}
                    className={`${editableCellClass} text-center`}
                  />
                  {lookups ? (
                    <datalist id={`doc-grades-${line.id}`}>
                      {lookups.grades.map((g) => (
                        <option key={g.id} value={g.code} />
                      ))}
                    </datalist>
                  ) : null}
                </td>
                <td className="py-1 pr-2 text-right tabular-nums">
                  <div className="flex items-center justify-end gap-0.5">
                    <span className="text-slate-500">£</span>
                    <input
                      form={`line-${line.id}`}
                      name="unitPriceGbp"
                      type="number"
                      step="0.01"
                      defaultValue={line.unitPriceGbp}
                      className={`${editableCellClass} text-right`}
                    />
                  </div>
                </td>
                <td className="py-2 text-right tabular-nums">
                  {money(line.qty * line.unitPriceGbp)}
                </td>
                <td className="no-print py-1 pl-2 text-right">
                  <button
                    form={`line-${line.id}`}
                    type="submit"
                    className="rounded-lg px-2 py-1 text-xs font-medium text-[#0b3a6e] hover:bg-slate-100 dark:text-sky-400"
                  >
                    Save
                  </button>
                  <form
                    id={`line-${line.id}`}
                    action={updateInvoiceLine}
                    className="hidden"
                  >
                    <input type="hidden" name="id" value={invoice.id} />
                    <input type="hidden" name="lineId" value={line.id} />
                    <input type="hidden" name="buyPriceGbp" value={line.buyPriceGbp ?? 0} />
                  </form>
                </td>
              </tr>
            ) : (
              <tr key={line.id} className="border-b border-slate-100">
                <td className="py-2 pr-2">{line.qty}</td>
                <td className="py-2 pr-2">{line.productName}</td>
                <td className="py-2 pr-2">{line.color}</td>
                <td className="py-2 pr-2">{line.network}</td>
                <td className="py-2 pr-2 text-center">{line.grade}</td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {money(line.unitPriceGbp)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {money(line.qty * line.unitPriceGbp)}
                </td>
              </tr>
            ),
          )}
          {hasShipping ? (
            <tr className="border-b border-slate-100">
              <td className="py-2 pr-2">1</td>
              <td className="py-2 pr-2" colSpan={4}>
                {invoice.shippingLabel || "Shipping"}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">
                {money(invoice.shippingCostGbp)}
              </td>
              <td className="py-2 text-right tabular-nums">
                {money(invoice.shippingCostGbp)}
              </td>
              {editable ? <td className="no-print" /> : null}
            </tr>
          ) : null}
        </tbody>
      </table>
      </div>

      <div className="mt-6 flex flex-wrap justify-between gap-6">
        <div className="max-w-sm text-sm text-slate-600">
          <div className="text-xs uppercase tracking-wide text-slate-500">Bank details</div>
          <div>Bank Name: {company.bank.bankName}</div>
          <div>Account Name: {company.bank.accountName}</div>
          <div>Sort code: {company.bank.sortCode}</div>
          <div>Account: {company.bank.accountNumber}</div>
          <div className="mt-2">
            Payment Reference: {invoice.invoiceNumber}
            <br />
            You must enter {invoice.invoiceNumber} as your payment reference.
          </div>
        </div>
        <div className="ml-auto w-full max-w-sm text-sm">
          <div className="flex justify-between py-1">
            <span>Subtotal</span>
            <span>{money(totals.subGbp)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Shipping</span>
            <span>{money(totals.shippingGbp)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-300 py-2 text-base font-semibold">
            <span>Grand Total</span>
            <span>{money(totals.totalGbp)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Payment Due</span>
            <span>{money(totals.dueGbp)}</span>
          </div>
        </div>
      </div>

      {editable && invoice.notes ? (
        <div className="no-print mt-8 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Internal note · not shown on the invoice
          </div>
          <p className="mt-1">{invoice.notes}</p>
        </div>
      ) : null}

      <p className="mt-6 text-xs text-slate-500">{INVOICE_INVALID_UNTIL_PAID_NOTICE}</p>

      <div className="print-page-break mt-8 border-t border-slate-200 pt-8 text-xs text-slate-600">
        <h2 className="text-sm font-semibold text-slate-900">Invoice Notes</h2>
        <p className="mt-2">
          Please read our terms before making the payment. By making payment you agree to below
          terms applied to sold stock on above invoice.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          {INVOICE_TERMS.map((term, index) => (
            <li key={index}>{term}</li>
          ))}
        </ol>
        <p className="mt-6">
          Company Registration number: {company.companyNo}
          <br />
          EORI Number: {company.eoriNumber}
        </p>
      </div>
    </div>
  );
}
