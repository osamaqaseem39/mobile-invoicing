import { MobileListRow } from "@/components/mobile-list-row";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EditLink } from "@/components/ui/edit-link";
import { Select } from "@/components/ui/select";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { ClickableRow } from "@/components/ui/clickable-row";
import { requireUser } from "@/lib/auth-guard";
import { invoiceTotals } from "@/lib/invoice";
import { apiClient } from "@/lib/api-client";
import { formatGbp } from "@/lib/money";
import { formatDate } from "@/lib/utils";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  status: string;
  issuedAt: string;
  shippingCostGbp: number;
  paidAmountGbp: number;
  customer: { clientId: string; name: string };
  lines: { qty: number; unitPriceGbp: number }[];
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { status } = await searchParams;
  const query = status ? `?${new URLSearchParams({ status })}` : "";
  const invoices = await apiClient.get<InvoiceRow[]>(`/invoices${query}`, apiToken);

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Pending, awaiting payment, and paid."
        action={{ href: "/invoices/new", label: "Create invoice" }}
      />
      <form className="mb-4">
        <Select name="status" defaultValue={status ?? ""} className="w-56">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="AWAITING_PAYMENT">Awaiting payment</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
        <button className="ml-2 h-11 rounded-lg border border-gray-300 bg-white px-4 text-theme-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]">
          Filter
        </button>
      </form>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <THead>
            <tr>
              <Th>Invoice</Th>
              <Th>Client ID</Th>
              <Th>Customer</Th>
              <Th>Status</Th>
              <Th>Total</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </tr>
          </THead>
          <tbody>
            {invoices.map((invoice) => {
              const totals = invoiceTotals(invoice);
              return (
                <ClickableRow key={invoice.id} href={`/invoices/${invoice.id}`}>
                  <Td className="font-medium text-brand-500 dark:text-sky-400">{invoice.invoiceNumber}</Td>
                  <Td className="font-mono">{invoice.customer.clientId}</Td>
                  <Td>{invoice.customer.name}</Td>
                  <Td>
                    <StatusBadge status={invoice.status} />
                  </Td>
                  <Td>{formatGbp(totals.totalGbp)}</Td>
                  <Td>{formatDate(invoice.issuedAt)}</Td>
                  <Td>
                    <EditLink
                      href={`/invoices/${invoice.id}`}
                      label={`Edit ${invoice.invoiceNumber}`}
                    />
                  </Td>
                </ClickableRow>
              );
            })}
          </tbody>
        </Table>
      </div>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white lg:hidden dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {invoices.map((invoice) => {
          const totals = invoiceTotals(invoice);
          return (
            <MobileListRow
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              title={invoice.invoiceNumber}
              subtitle={invoice.customer.name}
              trailing={<StatusBadge status={invoice.status} />}
              meta={formatGbp(totals.totalGbp)}
            />
          );
        })}
        {!invoices.length ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No invoices yet.</p>
        ) : null}
      </div>
    </div>
  );
}
