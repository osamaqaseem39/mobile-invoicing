import Link from "next/link";
import { MobileListRow } from "@/components/mobile-list-row";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EditLink } from "@/components/ui/edit-link";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth-guard";
import { apiClient } from "@/lib/api-client";
import { formatGbp } from "@/lib/money";
import { formatDate } from "@/lib/utils";

type PurchaseOrderRow = {
  id: string;
  poNumber: string;
  status: string;
  shippingCostGbp: number;
  actualCostGbp: number;
  createdAt: string;
  supplier: { name: string };
  lines: { qty: number }[];
  stockUnits: unknown[];
};

export default async function PurchaseOrdersPage() {
  const { apiToken } = await requireUser();
  const orders = await apiClient.get<PurchaseOrderRow[]>("/purchase-orders", apiToken);

  return (
    <div>
      <PageHeader
        title="Purchase orders"
        description="Order stock from suppliers, then receive IMEIs by grade."
        action={{ href: "/purchase-orders/new", label: "Create PO" }}
      />
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <THead>
            <tr>
              <Th>PO</Th>
              <Th>Supplier</Th>
              <Th>Status</Th>
              <Th>Shipping</Th>
              <Th>Actual cost</Th>
              <Th>Received</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </tr>
          </THead>
          <tbody>
            {orders.map((po) => {
              const ordered = po.lines.reduce((sum, line) => sum + line.qty, 0);
              return (
                <tr key={po.id}>
                  <Td>
                    <Link className="font-medium text-brand-500 hover:underline dark:text-sky-400" href={`/purchase-orders/${po.id}`}>
                      {po.poNumber}
                    </Link>
                  </Td>
                  <Td>{po.supplier.name}</Td>
                  <Td>
                    <StatusBadge status={po.status} />
                  </Td>
                  <Td>{formatGbp(po.shippingCostGbp)}</Td>
                  <Td>{formatGbp(po.actualCostGbp)}</Td>
                  <Td>
                    {po.stockUnits.length}/{ordered}
                  </Td>
                  <Td>{formatDate(po.createdAt)}</Td>
                  <Td>
                    <EditLink href={`/purchase-orders/${po.id}`} label={`Edit ${po.poNumber}`} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white lg:hidden dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {orders.map((po) => {
          const ordered = po.lines.reduce((sum, line) => sum + line.qty, 0);
          return (
            <MobileListRow
              key={po.id}
              href={`/purchase-orders/${po.id}`}
              title={po.poNumber}
              subtitle={po.supplier.name}
              trailing={<StatusBadge status={po.status} />}
              meta={`${po.stockUnits.length}/${ordered} received`}
            />
          );
        })}
        {!orders.length ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No purchase orders yet.</p>
        ) : null}
      </div>
    </div>
  );
}
