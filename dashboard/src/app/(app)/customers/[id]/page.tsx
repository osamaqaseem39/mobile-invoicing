import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCustomer, updateCustomer } from "@/actions/customers";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth-guard";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CustomerLookup } from "@/lib/lookups";

type CustomerDetail = CustomerLookup & {
  invoices: { id: string; invoiceNumber: string; status: string }[];
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { id } = await params;
  const { ok, error } = await searchParams;
  let customer: CustomerDetail;
  try {
    customer = await apiClient.get<CustomerDetail>(`/customers/${id}`, apiToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={customer.name} description={`Client ID ${customer.clientId}`} />
      <Notice ok={ok} error={error} />
      <Card>
        <form action={updateCustomer} className="space-y-4">
          <input type="hidden" name="id" value={customer.id} />
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={customer.name} required />
          </div>
          <div>
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" name="businessName" defaultValue={customer.businessName ?? ""} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={customer.phone ?? ""} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" defaultValue={customer.email ?? ""} />
            </div>
          </div>
          <div>
            <Label htmlFor="vatNumber">VAT</Label>
            <Input id="vatNumber" name="vatNumber" defaultValue={customer.vatNumber ?? ""} />
          </div>
          <div>
            <Label htmlFor="address">Billing address</Label>
            <Textarea id="address" name="address" defaultValue={customer.address ?? ""} />
          </div>
          <div>
            <Label htmlFor="shippingAddress">Shipping address (if different)</Label>
            <Textarea
              id="shippingAddress"
              name="shippingAddress"
              defaultValue={customer.shippingAddress ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={customer.notes ?? ""} />
          </div>
          <SubmitButton pendingText="Saving…">Save</SubmitButton>
        </form>
      </Card>
      <Card>
        <h2 className="mb-3 font-medium">Invoices</h2>
        <ul className="space-y-2 text-sm">
          {customer.invoices.map((invoice) => (
            <li key={invoice.id} className="flex justify-between">
              <Link className="text-brand-500 hover:underline dark:text-sky-400" href={`/invoices/${invoice.id}`}>
                {invoice.invoiceNumber}
              </Link>
              <StatusBadge status={invoice.status} />
            </li>
          ))}
          {!customer.invoices.length ? (
            <li className="text-slate-500 dark:text-slate-400">No invoices yet.</li>
          ) : null}
        </ul>
      </Card>
      <Card className="border-red-100 dark:border-red-900/40">
        <h2 className="mb-1 font-medium text-red-700 dark:text-red-400">Delete customer</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Only possible while this customer has no invoices or RMAs on record.
        </p>
        <form action={deleteCustomer}>
          <input type="hidden" name="id" value={customer.id} />
          <ConfirmSubmitButton
            variant="danger"
            pendingText="Deleting…"
            confirmTitle={`Delete customer "${customer.name}"?`}
            confirmMessage="This cannot be undone."
          >
            Delete customer
          </ConfirmSubmitButton>
        </form>
      </Card>
    </div>
  );
}
