import Link from "next/link";
import { MobileListRow } from "@/components/mobile-list-row";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth-guard";
import { apiClient } from "@/lib/api-client";
import { formatGbp } from "@/lib/money";
import { formatDate } from "@/lib/utils";

type ShipmentRow = {
  id: string;
  shipmentNumber: string;
  trackingNumber: string | null;
  carrier: string | null;
  shippingCostGbp: number;
  actualCostGbp: number;
  status: string;
  createdAt: string;
  invoice: { invoiceNumber: string };
};

export default async function ShipmentsPage() {
  const { apiToken } = await requireUser();
  const shipments = await apiClient.get<ShipmentRow[]>("/shipments", apiToken);

  return (
    <div>
      <PageHeader
        title="Shipments"
        description="Tracking, quoted shipping cost, and actual courier cost."
        action={{ href: "/shipments/new", label: "Add shipment" }}
      />
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <THead>
            <tr>
              <Th>Shipment</Th>
              <Th>Invoice</Th>
              <Th>Tracking</Th>
              <Th>Carrier</Th>
              <Th>Shipping cost</Th>
              <Th>Actual cost</Th>
              <Th>Status</Th>
              <Th>Date</Th>
            </tr>
          </THead>
          <tbody>
            {shipments.map((shipment) => (
              <tr key={shipment.id}>
                <Td>
                  <Link className="font-medium text-brand-500 hover:underline dark:text-sky-400" href={`/shipments/${shipment.id}`}>
                    {shipment.shipmentNumber}
                  </Link>
                </Td>
                <Td>{shipment.invoice.invoiceNumber}</Td>
                <Td className="font-mono text-xs">{shipment.trackingNumber || "—"}</Td>
                <Td>{shipment.carrier || "—"}</Td>
                <Td>{formatGbp(shipment.shippingCostGbp)}</Td>
                <Td>{formatGbp(shipment.actualCostGbp)}</Td>
                <Td>
                  <StatusBadge status={shipment.status} />
                </Td>
                <Td>{formatDate(shipment.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white lg:hidden dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {shipments.map((shipment) => (
          <MobileListRow
            key={shipment.id}
            href={`/shipments/${shipment.id}`}
            title={shipment.shipmentNumber}
            subtitle={`Inv ${shipment.invoice.invoiceNumber}`}
            trailing={<StatusBadge status={shipment.status} />}
            meta={shipment.trackingNumber || shipment.carrier || "No tracking yet"}
          />
        ))}
        {!shipments.length ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No shipments yet.</p>
        ) : null}
      </div>
    </div>
  );
}
