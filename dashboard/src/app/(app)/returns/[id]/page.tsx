import Link from "next/link";
import { notFound } from "next/navigation";
import { applyRmaCredit, processRma } from "@/actions/rma";
import { GoodsNotReceivedWarning } from "@/components/goods-not-received-warning";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth-guard";
import { formatGbp } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { apiClient, ApiError } from "@/lib/api-client";
import { rmaCreditSummary, rmaGoodsReceived } from "@/lib/rma";
import { labelStatus, RMA_PAYMENT_TYPES, RMA_STATUSES } from "@/lib/status";

type RmaDetail = {
  id: string;
  rmaNumber: string;
  status: string;
  reason: string | null;
  notes: string | null;
  invoiceId: string;
  paymentType: string;
  paymentAmountGbp: number;
  paymentDate: string | null;
  appliedInvoiceId: string | null;
  customer: { name: string };
  invoice: { invoiceNumber: string };
  appliedInvoice: { id: string; invoiceNumber: string } | null;
  payments: {
    id: string;
    amountGbp: number;
    paidAt: string;
    invoice: { id: string; invoiceNumber: string };
  }[];
  items: {
    id: string;
    reason: string | null;
    unitPriceGbp: number;
    action: string;
    invoiceNumber: string | null;
    productName: string | null;
    imei: string | null;
    grade: string | null;
    stockUnit: { imei: string; productName: string; grade: string; status: string } | null;
  }[];
};
type InvoiceOption = { id: string; invoiceNumber: string; customer: { name: string } };

export default async function RmaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { id } = await params;
  const { ok, error } = await searchParams;
  let rma: RmaDetail;
  try {
    rma = await apiClient.get<RmaDetail>(`/rma/${id}`, apiToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const credit = rmaCreditSummary(rma);
  const remainingGbp = credit.remainingGbp;
  const invoices = (await apiClient.get<InvoiceOption[]>("/invoices", apiToken)).slice(0, 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title={rma.rmaNumber}
        description={`${rma.customer.name} · ${rma.invoice.invoiceNumber}`}
      />
      <Notice ok={ok} error={error} />
      <div className="no-print">
        <Link
          href={`/returns/${rma.id}/print`}
          className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
        >
          Format / print
        </Link>
      </div>
      <Card>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Reason: {rma.reason || "—"}
          {rma.notes ? <span> · {rma.notes}</span> : null}
        </p>
        <p className="mt-2">
          Invoice:{" "}
          <Link className="text-[#0b3a6e] hover:underline dark:text-sky-400" href={`/invoices/${rma.invoiceId}`}>
            {rma.invoice.invoiceNumber}
          </Link>
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Total amount
            </dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {formatGbp(credit.totalGbp)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Amount applied
            </dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {formatGbp(credit.appliedGbp)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Balance remaining
            </dt>
            <dd
              className={`mt-1 text-lg font-semibold tabular-nums ${
                credit.availableGbp > 0 ? "text-[#0b3a6e] dark:text-sky-400" : "text-slate-500"
              }`}
            >
              {formatGbp(credit.remainingGbp)}
            </dd>
            {credit.settled && credit.remainingGbp > 0 ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Marked {labelStatus(rma.paymentType)} — this balance can no longer be applied.
              </p>
            ) : null}
          </div>
        </dl>
      </Card>
      <Card>
        <Table>
          <THead>
            <tr>
              <Th>Invoice</Th>
              <Th>IMEI</Th>
              <Th>Product</Th>
              <Th>Reason</Th>
              <Th>Unit price</Th>
              <Th>Action</Th>
              <Th>Stock status</Th>
            </tr>
          </THead>
          <tbody>
            {rma.items.map((item) => (
              <tr key={item.id}>
                <Td>{item.invoiceNumber ?? rma.invoice.invoiceNumber}</Td>
                <Td className="font-mono">{item.stockUnit?.imei ?? item.imei ?? "—"}</Td>
                <Td>
                  {item.stockUnit?.productName ?? item.productName} ·{" "}
                  {item.stockUnit?.grade ?? item.grade}
                </Td>
                <Td>{item.reason || "—"}</Td>
                <Td>{formatGbp(item.unitPriceGbp)}</Td>
                <Td>{item.action}</Td>
                <Td>
                  {item.stockUnit ? <StatusBadge status={item.stockUnit.status} /> : "—"}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card>
        <form action={processRma} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={rma.id} />
          <div>
            <Select name="status" defaultValue={rma.status}>
              {RMA_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <SubmitButton pendingText="Updating…">Update RMA</SubmitButton>
        </form>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Set to Received, Refunded, or Closed to restock, credit, or write off units.
        </p>
      </Card>
      <Card>
        <h2 className="mb-3 font-medium">Apply credit</h2>
        {rmaGoodsReceived(rma) ? null : <GoodsNotReceivedWarning variant="block" />}
        <form action={applyRmaCredit} className="space-y-3">
          <input type="hidden" name="rmaId" value={rma.id} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="paymentType">Payment type</Label>
              <Select id="paymentType" name="paymentType" defaultValue={rma.paymentType}>
                {RMA_PAYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="appliedInvoiceId">Apply to invoice</Label>
              <Select
                id="appliedInvoiceId"
                name="appliedInvoiceId"
                defaultValue={rma.appliedInvoiceId ?? ""}
              >
                <option value="">Select invoice</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} · {invoice.customer.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="paymentAmountGbp">Amount GBP</Label>
              <Input
                id="paymentAmountGbp"
                name="paymentAmountGbp"
                type="number"
                step="0.01"
                max={remainingGbp}
                defaultValue={remainingGbp}
              />
            </div>
            <div>
              <Label htmlFor="paymentDate">Payment date</Label>
              <Input
                id="paymentDate"
                name="paymentDate"
                type="date"
                defaultValue={rma.paymentDate ? rma.paymentDate.slice(0, 10) : ""}
              />
            </div>
          </div>
          <SubmitButton pendingText="Saving…">Save credit</SubmitButton>
        </form>
        {rma.payments.length ? (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium">Applied to invoices</h3>
            <Table>
              <THead>
                <tr>
                  <Th>Date</Th>
                  <Th>Amount</Th>
                  <Th>Invoice</Th>
                </tr>
              </THead>
              <tbody>
                {rma.payments.map((payment) => (
                  <tr key={payment.id}>
                    <Td>{formatDate(payment.paidAt)}</Td>
                    <Td>{formatGbp(payment.amountGbp)}</Td>
                    <Td>
                      <Link
                        className="text-[#0b3a6e] hover:underline dark:text-sky-400"
                        href={`/invoices/${payment.invoice.id}`}
                      >
                        {payment.invoice.invoiceNumber}
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
