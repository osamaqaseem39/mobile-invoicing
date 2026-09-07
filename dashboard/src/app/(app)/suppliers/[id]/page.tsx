import { notFound } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, Scale } from "lucide-react";
import { addLedgerEntry, deleteSupplier } from "@/actions/suppliers";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { SupplierDetailsCard } from "@/components/supplier-details-card";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth-guard";
import { totalsFromLedger, withRunningBalance, type LedgerEntry } from "@/lib/ledger";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatGbp } from "@/lib/money";
import type { SupplierLookup } from "@/lib/lookups";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";

type LedgerRow = LedgerEntry & {
  id: string;
  date: string;
  reference: string | null;
  notes: string | null;
};
type SupplierDetail = SupplierLookup & {
  ledger: LedgerRow[];
  purchaseOrders: { id: string; poNumber: string; status: string }[];
};

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { id } = await params;
  const { error, ok } = await searchParams;
  let supplier: SupplierDetail;
  try {
    supplier = await apiClient.get<SupplierDetail>(`/suppliers/${id}`, apiToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const totals = totalsFromLedger(supplier.ledger);
  const rows = withRunningBalance(supplier.ledger).reverse();
  const owed = totals.balanceGbp > 0;

  return (
    <div className="space-y-6">
      <PageHeader title={supplier.name} description="Supplier hisab and details" />
      <Notice error={error} ok={ok} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-start gap-3">
          <div className="rounded-lg bg-sky-50 p-2 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
            <ArrowDownCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Credit (goods received)</div>
            {formatGbp(totals.creditGbp)}
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <ArrowUpCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Debit (paid out)</div>
            {formatGbp(totals.debitGbp)}
          </div>
        </Card>
        <Card
          className={cn(
            "flex items-start gap-3",
            owed
              ? "bg-amber-50/60 ring-1 ring-amber-200 dark:bg-amber-950/20 dark:ring-amber-900/40"
              : "bg-emerald-50/60 ring-1 ring-emerald-200 dark:bg-emerald-950/20 dark:ring-emerald-900/40",
          )}
        >
          <div
            className={cn(
              "rounded-lg p-2",
              owed
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
            )}
          >
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {owed ? "Balance payable" : "Balance settled"}
            </div>
            {formatGbp(totals.balanceGbp)}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 font-medium">Record credit / debit</h2>
            <form action={addLedgerEntry} className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <input type="hidden" name="supplierId" value={supplier.id} />
              <div>
                <Label>Type</Label>
                <Select name="type" defaultValue="DEBIT">
                  <option value="DEBIT">Debit (payment / return)</option>
                  <option value="CREDIT">Credit (goods / you owe)</option>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input name="date" type="date" />
              </div>
              <div>
                <Label>Reference</Label>
                <Input name="reference" placeholder="PO-0001 / payment" />
              </div>
              <div>
                <Label>Amount GBP</Label>
                <Input name="amountGbp" type="number" step="0.01" required />
              </div>
              <div>
                <Label>Notes</Label>
                <Input name="notes" />
              </div>
              <div className="sm:col-span-2 md:col-span-3">
                <SubmitButton pendingText="Adding…">Add to hisab</SubmitButton>
              </div>
            </form>
          </Card>

          <Card className="p-0">
            <h2 className="px-5 pt-5 font-medium">Hisab ledger</h2>
            <div className="mt-3">
              <Table>
                <THead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Type</Th>
                    <Th>Amount</Th>
                    <Th>Running balance</Th>
                    <Th>Reference</Th>
                  </tr>
                </THead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <Td>{formatDate(row.date)}</Td>
                      <Td>
                        <StatusBadge status={row.type} />
                      </Td>
                      <Td>{formatGbp(row.amountGbp)}</Td>
                      <Td>{formatGbp(row.balanceGbp)}</Td>
                      <Td>
                        {row.reference || "—"}
                        {row.notes ? (
                          <div className="text-xs text-slate-500 dark:text-slate-400">{row.notes}</div>
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                  {!rows.length ? (
                    <tr>
                      <Td className="text-slate-500 dark:text-slate-400" colSpan={5}>
                        No ledger entries yet.
                      </Td>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <SupplierDetailsCard supplier={supplier} />

          <Card>
            <h2 className="mb-3 font-medium">Purchase orders</h2>
            <ul className="space-y-2 text-sm">
              {supplier.purchaseOrders.map((po) => (
                <li key={po.id} className="flex items-center justify-between">
                  <Link className="text-brand-500 hover:underline dark:text-sky-400" href={`/purchase-orders/${po.id}`}>
                    {po.poNumber}
                  </Link>
                  <StatusBadge status={po.status} />
                </li>
              ))}
              {!supplier.purchaseOrders.length ? (
                <li className="text-slate-500 dark:text-slate-400">No purchase orders.</li>
              ) : null}
            </ul>
          </Card>

          <Card className="border-red-100 dark:border-red-900/40">
            <h2 className="mb-1 font-medium text-red-700 dark:text-red-400">Delete supplier</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Only possible while this supplier has no purchase orders or stock on record.
            </p>
            <form action={deleteSupplier}>
              <input type="hidden" name="id" value={supplier.id} />
              <ConfirmSubmitButton
                variant="danger"
                pendingText="Deleting…"
                confirmTitle={`Delete supplier "${supplier.name}"?`}
                confirmMessage="This cannot be undone."
              >
                Delete supplier
              </ConfirmSubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
