import { createInvoice } from "@/actions/invoices";
import { InvoiceForm } from "@/components/invoice-form";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth-guard";
import { getLookups } from "@/lib/lookups";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CustomerLookup } from "@/lib/lookups";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; customerId?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { error, customerId } = await searchParams;
  const lookups = await getLookups(apiToken);
  let newCustomer: CustomerLookup | null = null;
  if (customerId) {
    try {
      newCustomer = await apiClient.get<CustomerLookup>(`/customers/${customerId}`, apiToken);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) throw err;
    }
  }
  return (
    <div>
      <PageHeader
        title="Create invoice"
        description="Invoice number is assigned automatically. Type a customer name to fetch their details."
      />
      <Notice error={error} ok={newCustomer ? `Customer ${newCustomer.name} added` : undefined} />
      <Card>
        <ActionForm action={createInvoice} className="space-y-6">
          <InvoiceForm
            grades={lookups.grades}
            colors={lookups.colors}
            networks={lookups.networks}
            initialCustomer={newCustomer}
          />
          <SubmitButton pendingText="Saving…">Save invoice</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
