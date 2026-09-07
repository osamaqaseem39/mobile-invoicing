import Link from "next/link";
import { MobileListRow } from "@/components/mobile-list-row";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { EditLink } from "@/components/ui/edit-link";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth-guard";
import { apiClient } from "@/lib/api-client";
import type { CustomerLookup } from "@/lib/lookups";

type CustomerRow = CustomerLookup & { _count: { invoices: number } };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { ok, error } = await searchParams;
  const customers = await apiClient.get<CustomerRow[]>("/customers", apiToken);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Client ID is assigned automatically. Type a name on invoices to auto-fetch details."
        action={{ href: "/customers/new", label: "Add customer" }}
      />
      <Notice ok={ok} error={error} />
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <THead>
            <tr>
              <Th>Client ID</Th>
              <Th>Name</Th>
              <Th>Business</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
              <Th>Invoices</Th>
              <Th>Actions</Th>
            </tr>
          </THead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <Td className="font-mono">{customer.clientId}</Td>
                <Td>
                  <Link className="font-medium text-brand-500 hover:underline dark:text-sky-400" href={`/customers/${customer.id}`}>
                    {customer.name}
                  </Link>
                </Td>
                <Td>{customer.businessName || "—"}</Td>
                <Td>{customer.phone || "—"}</Td>
                <Td>{customer.email || "—"}</Td>
                <Td>{customer._count.invoices}</Td>
                <Td>
                  <EditLink href={`/customers/${customer.id}`} label={`Edit ${customer.name}`} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white lg:hidden dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {customers.map((customer) => (
          <MobileListRow
            key={customer.id}
            href={`/customers/${customer.id}`}
            title={customer.name}
            subtitle={customer.businessName || customer.phone || customer.email || "—"}
            meta={`${customer._count.invoices} invoice${customer._count.invoices === 1 ? "" : "s"}`}
          />
        ))}
        {!customers.length ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No customers yet.</p>
        ) : null}
      </div>
    </div>
  );
}
