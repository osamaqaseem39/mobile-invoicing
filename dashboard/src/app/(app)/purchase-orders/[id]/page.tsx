import Link from "next/link";
import { notFound } from "next/navigation";
import { removePoAttachment, updatePurchaseOrderMeta } from "@/actions/purchase-orders";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { PurchaseOrderForm } from "@/components/purchase-order-form";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth-guard";
import { apiClient, ApiError } from "@/lib/api-client";
import { getLookups } from "@/lib/lookups";
import { formatGbp } from "@/lib/money";
import { formatDate } from "@/lib/utils";

type PurchaseOrderDetail = {
  id: string;
  poNumber: string;
  supplierId: string;
  status: string;
  notes: string | null;
  shippingCostGbp: number;
  actualCostGbp: number;
  attachmentFilename: string | null;
  createdAt: string;
  supplier: { name: string };
  lines: {
    id: string;
    qty: number;
    productName: string;
    color: string | null;
    network: string | null;
    grade: string | null;
    unitCostGbp: number;
  }[];
  stockUnits: { id: string; imei: string | null; productName: string; grade: string; status: string }[];
};

export default async function PurchaseOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { id } = await params;
  const { ok, error } = await searchParams;
  let po: PurchaseOrderDetail;
  try {
    po = await apiClient.get<PurchaseOrderDetail>(`/purchase-orders/${id}`, apiToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const lookups = await getLookups(apiToken);

  return (
    <div className="space-y-6">
      <PageHeader
        title={po.poNumber}
        description={`${po.supplier.name} · created ${formatDate(po.createdAt)}`}
      />
      <Notice ok={ok} error={error} />
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/purchase-orders/${po.id}/receive`}
          className="inline-flex h-10 items-center rounded-lg bg-[#0b3a6e] px-4 text-sm font-medium text-white"
        >
          Receive stock
        </Link>
        <Link
          href={`/suppliers/${po.supplierId}`}
          className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
        >
          Supplier hisab
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs text-slate-500 dark:text-slate-400">Status</div>
          <StatusBadge status={po.status} />
        </Card>
        <Card>
          <div className="text-xs text-slate-500 dark:text-slate-400">Shipping cost</div>
          {formatGbp(po.shippingCostGbp)}
        </Card>
        <Card>
          <div className="text-xs text-slate-500 dark:text-slate-400">Actual / landed cost</div>
          {formatGbp(po.actualCostGbp)}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-medium">Received IMEIs ({po.stockUnits.length})</h2>
        <Table>
          <THead>
            <tr>
              <Th>IMEI</Th>
              <Th>Product</Th>
              <Th className="text-center">Grade</Th>
              <Th>Status</Th>
            </tr>
          </THead>
          <tbody>
            {po.stockUnits.map((unit) => (
              <tr key={unit.id}>
                <Td className="font-mono">{unit.imei ?? "—"}</Td>
                <Td>{unit.productName}</Td>
                <Td className="text-center">{unit.grade}</Td>
                <Td>
                  <StatusBadge status={unit.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Attachment</h2>
        {po.attachmentFilename ? (
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/purchase-orders/${po.id}/attachment`}
              target="_blank"
              rel="noreferrer"
              className="text-[#0b3a6e] hover:underline dark:text-sky-400"
            >
              {po.attachmentFilename}
            </a>
            <form action={removePoAttachment}>
              <input type="hidden" name="id" value={po.id} />
              <SubmitButton pendingText="Removing…" size="sm" variant="ghost">
                Remove
              </SubmitButton>
            </form>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No file attached yet. Attach the incoming PO below.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 font-medium">Edit purchase order</h2>
        <form action={updatePurchaseOrderMeta} className="space-y-6">
          <input type="hidden" name="id" value={po.id} />
          <PurchaseOrderForm
            mode="edit"
            suppliers={lookups.suppliers}
            supplierName={po.supplier.name}
            grades={lookups.grades}
            colors={lookups.colors}
            networks={lookups.networks}
            initialLines={po.lines.map((line) => ({
              productName: line.productName,
              color: line.color || "Black",
              network: line.network || "Unlocked",
              grade: line.grade || "A",
              qty: line.qty,
              unitCostGbp: line.unitCostGbp,
            }))}
            initialStatus={po.status}
            initialShippingGbp={po.shippingCostGbp}
            initialActualCostGbp={po.actualCostGbp}
            initialNotes={po.notes ?? ""}
            existingAttachmentName={po.attachmentFilename}
          />
          <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
