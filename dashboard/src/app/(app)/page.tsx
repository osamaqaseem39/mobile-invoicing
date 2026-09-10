import Link from "next/link";
import { Boxes, Clock3, FileText, Layers, Package, Receipt, Truck, Warehouse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DashboardGreeting } from "@/components/dashboard-greeting";
import { MobileListRow } from "@/components/mobile-list-row";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { ClickableRow } from "@/components/ui/clickable-row";
import { requireUser } from "@/lib/auth-guard";
import { totalsFromLedger, type LedgerEntry } from "@/lib/ledger";
import { apiClient } from "@/lib/api-client";
import { formatGbp } from "@/lib/money";
import { formatDate } from "@/lib/utils";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  issuedAt: string;
  customer: { name: string };
};
type PurchaseOrder = { id: string; poNumber: string; status: string; supplier: { name: string } };
type Supplier = { ledger: LedgerEntry[] };
type Shipment = { status: string };
type StockUnit = { grade: string; status: string };

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = (user.name ?? user.email ?? "there").split(" ")[0];
  const [stock, invoices, purchaseOrders, suppliers, shipmentsList] = await Promise.all([
    apiClient.get<StockUnit[]>("/stock?status=IN_STOCK", user.apiToken),
    apiClient.get<Invoice[]>("/invoices", user.apiToken),
    apiClient.get<PurchaseOrder[]>("/purchase-orders", user.apiToken),
    apiClient.get<Supplier[]>("/suppliers", user.apiToken),
    apiClient.get<Shipment[]>("/shipments", user.apiToken),
  ]);

  const stockCounts = Object.values(
    stock.reduce<Record<string, { grade: string; _count: { _all: number } }>>((acc, unit) => {
      acc[unit.grade] = acc[unit.grade] ?? { grade: unit.grade, _count: { _all: 0 } };
      acc[unit.grade]._count._all += 1;
      return acc;
    }, {}),
  );
  const unpaid = invoices
    .filter((invoice) => ["PENDING", "AWAITING_PAYMENT"].includes(invoice.status))
    .slice(0, 8);
  const recentPos = purchaseOrders.slice(0, 6);
  const recentInvoices = invoices.slice(0, 6);
  const shipments = shipmentsList.filter((s) =>
    ["PREPARING", "SHIPPED", "IN_TRANSIT"].includes(s.status),
  ).length;

  const inStock = stock.length;
  const payableGbp = suppliers.reduce(
    (sum, supplier) => sum + totalsFromLedger(supplier.ledger).balanceGbp,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-theme-xs font-medium uppercase tracking-wider text-gray-400">
          Dashboard
        </div>
        <h1 className="mt-1 text-title-sm font-bold text-gray-800 dark:text-white/90">
          <DashboardGreeting firstName={firstName} />
        </h1>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          Here&apos;s what&apos;s happening across stock, invoices, and suppliers today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Boxes} label="In stock" value={inStock} tone="sky" />
        <StatCard icon={FileText} label="Unpaid invoices" value={unpaid.length} tone="amber" />
        <StatCard
          icon={Warehouse}
          label="Supplier payable"
          value={formatGbp(payableGbp)}
          tone="violet"
        />
        <StatCard icon={Truck} label="Open shipments" value={shipments} tone="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2.5 font-semibold text-gray-800 dark:text-white/90">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
              <Layers className="h-3.5 w-3.5" />
            </span>
            In stock by grade
          </h2>
          <div className="flex flex-wrap gap-2">
            {stockCounts.length ? (
              stockCounts.map((row) => (
                <div
                  key={row.grade}
                  className="flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-theme-sm text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
                >
                  <span className="text-slate-500 dark:text-slate-400">Grade {row.grade}</span>
                  <span className="font-semibold">{row._count._all}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No stock yet.</p>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 flex items-center gap-2.5 font-semibold text-gray-800 dark:text-white/90">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <Clock3 className="h-3.5 w-3.5" />
            </span>
            Awaiting payment
          </h2>
          {unpaid.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {unpaid.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <Link className="text-sm font-medium text-brand-500 hover:underline dark:text-sky-400" href={`/invoices/${invoice.id}`}>
                    {invoice.invoiceNumber} · {invoice.customer.name}
                  </Link>
                  <StatusBadge status={invoice.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No unpaid invoices.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-0">
          <h2 className="flex items-center gap-2 px-5 pt-5 font-semibold text-slate-900 dark:text-slate-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
              <Package className="h-3.5 w-3.5" />
            </span>
            Recent purchase orders
          </h2>
          <div className="mt-3 hidden lg:block">
            <Table>
              <THead>
                <tr>
                  <Th>PO</Th>
                  <Th>Supplier</Th>
                  <Th>Status</Th>
                </tr>
              </THead>
              <tbody>
                {recentPos.map((po) => (
                  <ClickableRow key={po.id} href={`/purchase-orders/${po.id}`}>
                    <Td className="font-medium text-brand-500 dark:text-sky-400">{po.poNumber}</Td>
                    <Td>{po.supplier.name}</Td>
                    <Td>
                      <StatusBadge status={po.status} />
                    </Td>
                  </ClickableRow>
                ))}
                {!recentPos.length ? (
                  <tr>
                    <Td className="text-slate-500 dark:text-slate-400" colSpan={3}>
                      No purchase orders yet.
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </div>
          <div className="mt-3 divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
            {recentPos.map((po) => (
              <MobileListRow
                key={po.id}
                href={`/purchase-orders/${po.id}`}
                title={po.poNumber}
                subtitle={po.supplier.name}
                trailing={<StatusBadge status={po.status} />}
              />
            ))}
            {!recentPos.length ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No purchase orders yet.</p>
            ) : null}
          </div>
        </Card>
        <Card className="p-0">
          <h2 className="flex items-center gap-2 px-5 pt-5 font-semibold text-slate-900 dark:text-slate-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-500">
              <Receipt className="h-3.5 w-3.5" />
            </span>
            Recent invoices
          </h2>
          <div className="mt-3 hidden lg:block">
            <Table>
              <THead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Customer</Th>
                  <Th>Date</Th>
                </tr>
              </THead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <ClickableRow key={invoice.id} href={`/invoices/${invoice.id}`}>
                    <Td className="font-medium text-brand-500 dark:text-sky-400">{invoice.invoiceNumber}</Td>
                    <Td>{invoice.customer.name}</Td>
                    <Td>{formatDate(invoice.issuedAt)}</Td>
                  </ClickableRow>
                ))}
                {!recentInvoices.length ? (
                  <tr>
                    <Td className="text-slate-500 dark:text-slate-400" colSpan={3}>
                      No invoices yet.
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </div>
          <div className="mt-3 divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
            {recentInvoices.map((invoice) => (
              <MobileListRow
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                title={invoice.invoiceNumber}
                subtitle={invoice.customer.name}
                trailing={formatDate(invoice.issuedAt)}
              />
            ))}
            {!recentInvoices.length ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No invoices yet.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
