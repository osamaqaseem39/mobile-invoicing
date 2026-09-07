import { addStock } from "@/actions/stock";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { StockBatchForm } from "@/components/stock-batch-form";
import { Card } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth-guard";
import { getLookups } from "@/lib/lookups";
import { apiClient } from "@/lib/api-client";

export default async function AddStockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { error } = await searchParams;
  const lookups = await getLookups(apiToken);
  const purchaseOrders = await apiClient.get<{ id: string; poNumber: string; supplierId: string }[]>(
    "/purchase-orders",
    apiToken,
  );

  return (
    <div>
      <PageHeader
        title="Add stock"
        description="Add IMEIs grade-wise, with colour, network, and unit cost in GBP."
      />
      <Notice error={error} />
      <Card>
        <ActionForm action={addStock}>
          <StockBatchForm
            grades={lookups.grades}
            colors={lookups.colors}
            networks={lookups.networks}
            suppliers={lookups.suppliers}
            purchaseOrders={purchaseOrders}
          />
          <div className="mt-6">
            <SubmitButton pendingText="Adding…">Add to inventory</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
