import { createPurchaseOrder } from "@/actions/purchase-orders";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { PurchaseOrderForm } from "@/components/purchase-order-form";
import { Card } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth-guard";
import { getLookups } from "@/lib/lookups";

export default async function NewPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { error } = await searchParams;
  const lookups = await getLookups(apiToken);
  return (
    <div>
      <PageHeader title="Create purchase order" />
      <Notice error={error} />
      <Card>
        <ActionForm action={createPurchaseOrder} className="space-y-6">
          <PurchaseOrderForm
            suppliers={lookups.suppliers}
            grades={lookups.grades}
            colors={lookups.colors}
            networks={lookups.networks}
          />
          <SubmitButton pendingText="Saving…">Save purchase order</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
