import { CompanyBrand } from "@/components/company-brand";
import { addressLines, company } from "@/lib/company";
import { formatGbp } from "@/lib/money";
import { groupRmaSummary, rmaCreditSummary } from "@/lib/rma";
import { labelStatus } from "@/lib/status";
import { RMA_TERMS } from "@/lib/terms";
import { formatDate } from "@/lib/utils";

export type CreditNoteDoc = {
  rmaNumber: string;
  status: string;
  createdAt: Date | string;
  paymentType: string;
  paymentDate: Date | string | null;
  paymentAmountGbp: number;
  notes: string | null;
  invoice: { invoiceNumber: string };
  appliedInvoice: { invoiceNumber: string } | null;
  payments: {
    id: string;
    amountGbp: number;
    paidAt: Date | string;
    invoice: { invoiceNumber: string };
  }[];
  customer: {
    clientId: string;
    name: string;
    businessName: string | null;
    phone: string | null;
    email: string | null;
    vatNumber: string | null;
    address: string | null;
  };
  items: {
    id: string;
    unitPriceGbp: number;
    reason: string | null;
    invoiceNumber: string | null;
    productName: string | null;
    imei: string | null;
    color: string | null;
    grade: string | null;
    stockUnit: {
      imei: string;
      productName: string;
      color: string;
      grade: string;
    } | null;
  }[];
};

export function CreditNoteDocument({ rma }: { rma: CreditNoteDoc }) {
  const credit = rmaCreditSummary(rma);
  const summary = groupRmaSummary(rma.items);
  const money = formatGbp;

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-slate-900 print:p-0">
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:justify-between">
        <div>
          <CompanyBrand company={company} />
          <p className="mt-2 text-sm text-slate-600">{addressLines(company).join(", ")}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold">CREDIT NOTE</div>
          <div className="mt-2 font-mono text-lg">Credit Note No. {rma.rmaNumber}</div>
          <div className="text-sm text-slate-600">RMA Date {formatDate(rma.createdAt)}</div>
          <div className="mt-2 text-sm font-medium">RMA Status: {labelStatus(rma.status)}</div>
          <div className="text-sm text-slate-600">Client ID: {rma.customer.clientId}</div>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-xs uppercase tracking-wide text-slate-500">Billing details</div>
        <div className="mt-1 font-medium">{rma.customer.name}</div>
        {rma.customer.businessName ? <div>{rma.customer.businessName}</div> : null}
        <div className="text-sm text-slate-600">
          {rma.customer.address ? <div>{rma.customer.address}</div> : null}
          {rma.customer.phone ? <div>{rma.customer.phone}</div> : null}
          {rma.customer.email ? <div>{rma.customer.email}</div> : null}
          {rma.customer.vatNumber ? <div>VAT Number: {rma.customer.vatNumber}</div> : null}
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-y border-slate-300 text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-2">Item</th>
            <th className="py-2 pr-2">Invoice No</th>
            <th className="py-2 pr-2">Product Name</th>
            <th className="py-2 pr-2">IMEI</th>
            <th className="py-2 pr-2">Colors</th>
            <th className="py-2 pr-2 text-center">Grade</th>
            <th className="py-2 text-right">Unit Price</th>
          </tr>
        </thead>
        <tbody>
          {rma.items.map((item, index) => (
            <tr key={item.id} className="border-b border-slate-100 align-top">
              <td className="py-2 pr-2">{index + 1}</td>
              <td className="py-2 pr-2">{item.invoiceNumber ?? rma.invoice.invoiceNumber}</td>
              <td className="py-2 pr-2">
                {item.stockUnit?.productName ?? item.productName}
                {item.reason ? (
                  <div className="text-xs text-slate-500">{item.reason}</div>
                ) : null}
              </td>
              <td className="py-2 pr-2 font-mono">{item.stockUnit?.imei ?? item.imei ?? "—"}</td>
              <td className="py-2 pr-2">{item.stockUnit?.color ?? item.color ?? "—"}</td>
              <td className="py-2 pr-2 text-center">{item.stockUnit?.grade ?? item.grade ?? "—"}</td>
              <td className="py-2 text-right tabular-nums">
                {money(item.unitPriceGbp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="mt-4 text-sm text-slate-600">Total: {rma.items.length}</div>

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-sm border-t border-slate-300 py-2 text-right text-base font-semibold">
          Grand Total: {money(credit.totalGbp)}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Stock Return Summary</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {summary.map((group) => (
            <li key={`${group.productName}-${group.color}-${group.grade}`}>
              {group.productName} - {group.color} - {group.grade} - {group.qty} Units
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Credit Summary</h2>
        <div className="mt-2 flex flex-wrap gap-x-10 gap-y-2 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Total amount</div>
            <div className="font-medium tabular-nums">{money(credit.totalGbp)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Amount applied</div>
            <div className="font-medium tabular-nums">{money(credit.appliedGbp)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Balance remaining</div>
            <div className="font-semibold tabular-nums">{money(credit.remainingGbp)}</div>
          </div>
        </div>

        {rma.payments.length ? (
          <table className="mt-4 w-full max-w-lg text-left text-sm">
            <thead>
              <tr className="border-y border-slate-300 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Applied to invoice</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rma.payments.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{formatDate(payment.paidAt)}</td>
                  <td className="py-2 pr-2">{payment.invoice.invoiceNumber}</td>
                  <td className="py-2 text-right tabular-nums">{money(payment.amountGbp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            This credit note has not been applied to any invoice yet.
          </p>
        )}

        <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div>Payment Type: {labelStatus(rma.paymentType)}</div>
          <div>Payment Date: {rma.paymentDate ? formatDate(rma.paymentDate) : "—"}</div>
        </div>
      </div>

      {rma.notes ? <p className="mt-6 text-sm text-slate-600">RMA Notes: {rma.notes}</p> : null}

      <div className="print-page-break mt-8 border-t border-slate-200 pt-8 text-xs text-slate-600">
        <ol className="list-decimal space-y-2 pl-5">
          {RMA_TERMS.map((term, index) => (
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
