import Link from "next/link";
import { MobileListRow } from "@/components/mobile-list-row";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth-guard";
import { apiClient } from "@/lib/api-client";
import { formatGbp } from "@/lib/money";
import { rmaCreditSummary } from "@/lib/rma";
import { formatDate } from "@/lib/utils";

type RmaRow = {
  id: string;
  rmaNumber: string;
  status: string;
  createdAt: string;
  customer: { name: string };
  invoice: { invoiceNumber: string };
  paymentType: string;
  items: { unitPriceGbp: number }[];
  payments: { amountGbp: number }[];
};

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { filter } = await searchParams;
  const all = await apiClient.get<RmaRow[]>("/rma", apiToken);

  const outstandingOnly = filter === "outstanding";
  const rows = all.map((rma) => ({ rma, credit: rmaCreditSummary(rma) }));
  const visible = outstandingOnly ? rows.filter((row) => row.credit.availableGbp > 0) : rows;
  const outstandingCount = rows.filter((row) => row.credit.availableGbp > 0).length;
  const outstandingTotal = rows.reduce((sum, row) => sum + row.credit.availableGbp, 0);

  return (
    <div>
      <PageHeader
        title="Returns / RMA"
        description="Create an RMA against an invoice and IMEI."
        action={{ href: "/returns/new", label: "Create RMA" }}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 text-sm dark:border-slate-700">
          <Link
            href="/returns"
            className={`px-3 py-2 ${
              outstandingOnly
                ? "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                : "bg-[#0b3a6e] font-medium text-white"
            }`}
          >
            All ({rows.length})
          </Link>
          <Link
            href="/returns?filter=outstanding"
            className={`border-l border-slate-200 px-3 py-2 dark:border-slate-700 ${
              outstandingOnly
                ? "bg-[#0b3a6e] font-medium text-white"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Credit remaining ({outstandingCount})
          </Link>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {formatGbp(outstandingTotal)} of credit still available across all returns.
        </p>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <THead>
            <tr>
              <Th>RMA</Th>
              <Th>Invoice</Th>
              <Th>Customer</Th>
              <Th>Items</Th>
              <Th>Total</Th>
              <Th>Applied</Th>
              <Th>Balance</Th>
              <Th>Status</Th>
              <Th>Date</Th>
            </tr>
          </THead>
          <tbody>
            {visible.map(({ rma, credit }) => (
              <tr key={rma.id}>
                <Td>
                  <Link className="font-medium text-[#0b3a6e] hover:underline dark:text-sky-400" href={`/returns/${rma.id}`}>
                    {rma.rmaNumber}
                  </Link>
                </Td>
                <Td>{rma.invoice.invoiceNumber}</Td>
                <Td>{rma.customer.name}</Td>
                <Td>{rma.items.length}</Td>
                <Td className="tabular-nums">{formatGbp(credit.totalGbp)}</Td>
                <Td className="tabular-nums">{formatGbp(credit.appliedGbp)}</Td>
                <Td
                  className={`tabular-nums ${
                    credit.availableGbp > 0
                      ? "font-medium text-[#0b3a6e] dark:text-sky-400"
                      : "text-slate-500"
                  }`}
                >
                  {formatGbp(credit.remainingGbp)}
                  {credit.settled && credit.remainingGbp > 0 ? (
                    <span className="block text-xs font-normal text-slate-400">
                      settled — not available
                    </span>
                  ) : null}
                </Td>
                <Td>
                  <StatusBadge status={rma.status} />
                </Td>
                <Td>{formatDate(rma.createdAt)}</Td>
              </tr>
            ))}
            {!visible.length ? (
              <tr>
                <Td className="text-center text-slate-500 dark:text-slate-400" colSpan={9}>
                  {outstandingOnly ? "No returns with credit remaining." : "No returns yet."}
                </Td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </div>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white lg:hidden dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {visible.map(({ rma, credit }) => (
          <MobileListRow
            key={rma.id}
            href={`/returns/${rma.id}`}
            title={rma.rmaNumber}
            subtitle={`${rma.customer.name} · Inv ${rma.invoice.invoiceNumber}`}
            trailing={<StatusBadge status={rma.status} />}
            meta={`${formatGbp(credit.totalGbp)} total · ${formatGbp(credit.appliedGbp)} applied · ${formatGbp(credit.remainingGbp)} left`}
          />
        ))}
        {!visible.length ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {outstandingOnly ? "No returns with credit remaining." : "No returns yet."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
