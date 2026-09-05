import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addInvoiceLine,
  createInstallmentPlan,
  payInstallment,
  recordInvoicePayment,
  updateInvoiceLineImeis,
  updateInvoiceMarginVat,
  updateInvoicePayment,
  updateInvoiceShipping,
  updateInvoiceStatus,
} from "@/actions/invoices";
import { applyRmaCreditToInvoice, getAvailableRmaCredits } from "@/actions/rma";
import { EmailInvoiceForm } from "@/components/email-invoice-form";
import { InvoiceDocument } from "@/components/invoice-document";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth-guard";
import { apiClient, ApiError } from "@/lib/api-client";
import { getLookups } from "@/lib/lookups";
import { invoiceTotals } from "@/lib/invoice";
import { formatGbp } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { rmaCreditSummary } from "@/lib/rma";
import { INVOICE_STATUSES } from "@/lib/status";

const PAYMENT_METHODS = ["Manual", "Bank transfer", "Cash", "Card", "Other"];

type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  status: string;
  issuedAt: string;
  shippingCostGbp: number;
  shippingLabel: string | null;
  paymentTerms: string | null;
  warrantyTerms: string | null;
  marginVatScheme: boolean;
  paidAmountGbp: number;
  notes: string | null;
  customer: {
    id: string;
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
    buyPriceGbp: number;
    imeis: string[];
  }[];
  stockUnits: { imei: string; invoiceLineId: string | null }[];
  payments: {
    id: string;
    amountGbp: number;
    method: string | null;
    notes: string | null;
    paidAt: string;
    rma: { id: string; rmaNumber: string } | null;
  }[];
  installments: {
    id: string;
    dueDate: string;
    amountGbp: number;
    status: string;
  }[];
};

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { id } = await params;
  const { ok, error } = await searchParams;
  let invoice: InvoiceDetail;
  try {
    invoice = await apiClient.get<InvoiceDetail>(`/invoices/${id}`, apiToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const lookups = await getLookups(apiToken);
  const totals = invoiceTotals(invoice);
  const availableCredits = await getAvailableRmaCredits(invoice.customer.id);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title={invoice.invoiceNumber} description={invoice.customer.name} />
      <Notice ok={ok} error={error} />
      <div className="no-print flex flex-wrap items-end gap-3">
        <form action={updateInvoiceStatus} className="flex items-end gap-2">
          <input type="hidden" name="id" value={invoice.id} />
          <div>
            <Select name="status" defaultValue={invoice.status}>
              {INVOICE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <SubmitButton pendingText="Updating…">Update status</SubmitButton>
        </form>
        <Link
          href={`/invoices/${invoice.id}/print`}
          className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
        >
          Format / print
        </Link>
        <Link
          href={`/returns/new?invoiceId=${invoice.id}`}
          className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
        >
          Create RMA
        </Link>
        <Link
          href={`/shipments/new?invoiceId=${invoice.id}`}
          className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
        >
          Add shipment
        </Link>
        <EmailInvoiceForm
          invoiceId={invoice.id}
          customerEmail={invoice.customer.email}
          returnTo={`/invoices/${invoice.id}`}
        />
      </div>
      <Card className="p-0">
        <InvoiceDocument invoice={invoice} editable lookups={lookups} />
      </Card>

      <Card className="no-print">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">Payments</h2>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Paid {formatGbp(totals.paidGbp)} of {formatGbp(totals.totalGbp)} — balance due{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {formatGbp(totals.dueGbp)}
            </span>
          </div>
        </div>

        {invoice.payments.length ? (
          <Table>
            <THead>
              <tr>
                <Th>Date</Th>
                <Th>Amount</Th>
                <Th>Method</Th>
                <Th>Via</Th>
                <Th>Notes</Th>
                <Th>{""}</Th>
              </tr>
            </THead>
            <tbody>
              {invoice.payments.map((payment) => (
                <tr key={payment.id}>
                  <Td>
                    <Input
                      form={`payment-${payment.id}`}
                      name="paidAt"
                      type="date"
                      defaultValue={payment.paidAt.slice(0, 10)}
                      className="w-36"
                    />
                  </Td>
                  <Td>
                    <Input
                      form={`payment-${payment.id}`}
                      name="amountGbp"
                      type="number"
                      step="0.01"
                      min={0.01}
                      defaultValue={payment.amountGbp}
                      className="w-28"
                    />
                  </Td>
                  <Td>
                    <Select
                      form={`payment-${payment.id}`}
                      name="method"
                      defaultValue={payment.method ?? ""}
                      className="w-36"
                    >
                      <option value="">—</option>
                      {PAYMENT_METHODS.concat(
                        payment.method && !PAYMENT_METHODS.includes(payment.method)
                          ? [payment.method]
                          : [],
                      ).map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td>
                    {payment.rma ? (
                      <Link
                        href={`/returns/${payment.rma.id}`}
                        className="text-[#0b3a6e] hover:underline dark:text-sky-400"
                      >
                        {payment.rma.rmaNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <Input
                      form={`payment-${payment.id}`}
                      name="notes"
                      defaultValue={payment.notes ?? ""}
                      className="w-40"
                    />
                  </Td>
                  <Td>
                    <Button type="submit" form={`payment-${payment.id}`} size="sm" variant="secondary">
                      Save
                    </Button>
                    <form id={`payment-${payment.id}`} action={updateInvoicePayment} className="hidden">
                      <input type="hidden" name="id" value={invoice.id} />
                      <input type="hidden" name="paymentId" value={payment.id} />
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            No payments recorded yet.
          </p>
        )}

        {totals.dueGbp > 0 ? (
          <form
            action={recordInvoicePayment}
            className="mt-4 grid gap-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700 sm:grid-cols-4"
          >
            <input type="hidden" name="id" value={invoice.id} />
            <div>
              <Label>Amount £</Label>
              <Input name="amountGbp" type="number" step="0.01" min={0.01} required />
            </div>
            <div>
              <Label>Date</Label>
              <Input name="paidAt" type="date" defaultValue={today} />
            </div>
            <div>
              <Label>Method</Label>
              <Select name="method" defaultValue="Manual">
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input name="notes" />
            </div>
            <div className="sm:col-span-4 flex justify-end">
              <SubmitButton pendingText="Recording…" size="sm">
                Record payment
              </SubmitButton>
            </div>
          </form>
        ) : null}

        {totals.dueGbp > 0 && availableCredits.length ? (
          <div className="mt-4 space-y-2 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <h3 className="text-sm font-medium">Apply RMA credit</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {invoice.customer.name} has credit available from returns. Apply all or part of it
              toward this invoice&apos;s balance — any amount left over stays available for other
              invoices.
            </p>
            {availableCredits.map((credit) => {
              const { totalGbp, appliedGbp, remainingGbp } = rmaCreditSummary(credit);
              const suggested = Math.min(remainingGbp, totals.dueGbp);
              return (
                <form
                  key={credit.id}
                  action={applyRmaCreditToInvoice}
                  className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0 dark:border-slate-800"
                >
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <input type="hidden" name="rmaId" value={credit.id} />
                  <p className="text-sm">
                    {credit.rmaNumber}
                    <span className="text-slate-500 dark:text-slate-400">
                      {" "}
                      (from Invoice {credit.invoice.invoiceNumber})
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {formatGbp(totalGbp)} total · {formatGbp(appliedGbp)} applied ·{" "}
                      {formatGbp(remainingGbp)} remaining
                    </span>
                  </p>
                  <div>
                    <Label>Amount £</Label>
                    <Input
                      name="amountGbp"
                      type="number"
                      step="0.01"
                      min={0.01}
                      max={remainingGbp}
                      defaultValue={suggested}
                      required
                    />
                  </div>
                  <SubmitButton pendingText="Applying…" size="sm" variant="secondary">
                    Apply
                  </SubmitButton>
                </form>
              );
            })}
          </div>
        ) : null}
      </Card>

      <Card className="no-print">
        <h2 className="mb-3 font-medium">Installment plan</h2>
        {invoice.installments.length ? (
          <Table>
            <THead>
              <tr>
                <Th>Due date</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>{""}</Th>
              </tr>
            </THead>
            <tbody>
              {invoice.installments.map((installment) => (
                <tr key={installment.id}>
                  <Td>{formatDate(installment.dueDate)}</Td>
                  <Td>{formatGbp(installment.amountGbp)}</Td>
                  <Td>{installment.status === "PAID" ? "Paid" : "Pending"}</Td>
                  <Td>
                    {installment.status === "PENDING" ? (
                      <form action={payInstallment}>
                        <input type="hidden" name="id" value={invoice.id} />
                        <input type="hidden" name="installmentId" value={installment.id} />
                        <SubmitButton pendingText="Saving…" size="sm" variant="secondary">
                          Mark paid
                        </SubmitButton>
                      </form>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            No installment plan set up for this invoice yet.
          </p>
        )}

        {totals.dueGbp > 0 ? (
          <form
            action={createInstallmentPlan}
            className="mt-4 grid gap-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700 sm:grid-cols-4"
          >
            <input type="hidden" name="id" value={invoice.id} />
            <div>
              <Label>Number of installments</Label>
              <Input name="count" type="number" min={2} defaultValue={3} required />
            </div>
            <div>
              <Label>First due date</Label>
              <Input name="startDate" type="date" />
            </div>
            <div>
              <Label>Days between installments</Label>
              <Input name="intervalDays" type="number" min={1} defaultValue={30} />
            </div>
            <div className="flex items-end">
              <SubmitButton pendingText="Saving…" size="sm">
                {invoice.installments.length ? "Replace plan" : "Create plan"}
              </SubmitButton>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 sm:col-span-4">
              Splits the current balance due ({formatGbp(totals.dueGbp)}) evenly across these
              installments. Any pending (unpaid) installments from an existing plan are replaced.
            </p>
          </form>
        ) : null}
      </Card>

      <Card className="no-print">
        <h2 className="mb-3 font-medium">Add invoice line</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          To edit an existing line, click into any field in the table above and hit Save on that
          row. Use this to add a brand new line instead.
        </p>
        <div className="space-y-3">
          <form
            action={addInvoiceLine}
            className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700 sm:grid-cols-4 lg:grid-cols-[1.8fr_1fr_1fr_0.6fr_0.5fr_1fr_1fr] lg:gap-y-1.5"
          >
            <input type="hidden" name="id" value={invoice.id} />
            <div className="col-span-2 sm:col-span-4 lg:col-span-1">
              <Label>Product name</Label>
              <Input name="productName" required />
            </div>
            <div>
              <Label>Color</Label>
              <Input name="color" list="colors-new" />
              <datalist id="colors-new">
                {lookups.colors.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>Network</Label>
              <Input name="network" list="networks-new" />
              <datalist id="networks-new">
                {lookups.networks.map((n) => (
                  <option key={n.id} value={n.name} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>Grade</Label>
              <Input name="grade" list="grades-new" />
              <datalist id="grades-new">
                {lookups.grades.map((g) => (
                  <option key={g.id} value={g.code} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>Qty</Label>
              <Input name="qty" type="number" min={1} defaultValue={1} required />
            </div>
            <div>
              <Label>Buy £</Label>
              <Input name="buyPriceGbp" type="number" step="0.01" defaultValue={0} />
            </div>
            <div>
              <Label>Sell £</Label>
              <Input name="unitPriceGbp" type="number" step="0.01" defaultValue={0} />
            </div>
            <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 sm:col-span-4 lg:col-span-7">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Buying price is for internal reference only and never appears on the printed invoice.
              </p>
              <SubmitButton pendingText="Adding…" size="sm">
                Add line
              </SubmitButton>
            </div>
          </form>
        </div>
      </Card>

      <Card className="no-print">
        <h2 className="mb-3 font-medium">Margin VAT scheme</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          When on, a Margin VAT Scheme notice is shown prominently at the top of the printed
          invoice.
        </p>
        <form action={updateInvoiceMarginVat} className="flex items-center gap-3">
          <input type="hidden" name="id" value={invoice.id} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="marginVatScheme"
              defaultChecked={invoice.marginVatScheme}
              className="rounded"
            />
            Sold under the Margin VAT Scheme
          </label>
          <SubmitButton pendingText="Saving…" size="sm">
            Save
          </SubmitButton>
        </form>
      </Card>

      <Card className="no-print">
        <h2 className="mb-3 font-medium">Shipping</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          This is the shipping cost that appears on the printed invoice total — separate from the
          courier tracking added via &ldquo;Add shipment&rdquo;.
        </p>
        <form action={updateInvoiceShipping} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="id" value={invoice.id} />
          <div>
            <Label>Shipping cost GBP</Label>
            <Input
              name="shippingCostGbp"
              type="number"
              step="0.01"
              defaultValue={invoice.shippingCostGbp}
            />
          </div>
          <div>
            <Label>Shipping line description</Label>
            <Input
              name="shippingLabel"
              placeholder="UPS Express Saver / Postage &amp; Packaging"
              defaultValue={invoice.shippingLabel ?? ""}
            />
          </div>
          <div className="flex items-end sm:col-span-3 sm:justify-end">
            <SubmitButton pendingText="Saving…" size="sm">
              Save shipping
            </SubmitButton>
          </div>
        </form>
      </Card>

      <Card className="no-print">
        <h2 className="mb-3 font-medium">Line IMEIs</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          IMEI is optional at invoice creation — add or edit it here at any time.
        </p>
        <Table>
          <THead>
            <tr>
              <Th>Product</Th>
              <Th>Qty</Th>
              <Th>IMEIs</Th>
            </tr>
          </THead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <Td>
                  {line.productName}
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {line.color} · {line.network} · {line.grade}
                  </div>
                </Td>
                <Td>{line.qty}</Td>
                <Td>
                  <form
                    action={updateInvoiceLineImeis}
                    className="flex flex-col gap-2 sm:flex-row sm:items-start"
                  >
                    <input type="hidden" name="id" value={invoice.id} />
                    <input type="hidden" name="lineId" value={line.id} />
                    <Textarea
                      name="imeis"
                      className="min-h-16 sm:flex-1"
                      placeholder="One 15-digit IMEI per line (optional)"
                      defaultValue={line.imeis.join("\n")}
                    />
                    <SubmitButton pendingText="Saving…" size="sm" variant="secondary">
                      Save IMEIs
                    </SubmitButton>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
