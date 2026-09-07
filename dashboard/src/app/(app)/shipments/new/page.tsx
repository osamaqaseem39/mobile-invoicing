import { createShipment } from "@/actions/shipments";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth-guard";
import { apiClient } from "@/lib/api-client";
import { SHIPMENT_STATUSES } from "@/lib/status";

type InvoiceOption = { id: string; invoiceNumber: string; customer: { name: string } };

export default async function NewShipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invoiceId?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { error, invoiceId } = await searchParams;
  const invoices = await apiClient.get<InvoiceOption[]>("/invoices", apiToken);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add shipment" />
      <Notice error={error} />
      <Card>
        <ActionForm action={createShipment} className="space-y-4">
          <div>
            <Label htmlFor="invoiceId">Invoice</Label>
            <Select id="invoiceId" name="invoiceId" required defaultValue={invoiceId ?? ""}>
              <option value="" disabled>
                Select invoice
              </option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} · {invoice.customer.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="carrier">Carrier</Label>
              <Input id="carrier" name="carrier" placeholder="DPD, Evri, DHL…" />
            </div>
            <div>
              <Label htmlFor="trackingNumber">Tracking number</Label>
              <Input id="trackingNumber" name="trackingNumber" />
            </div>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue="PREPARING">
              {SHIPMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Shipping cost GBP (quoted)</Label>
              <Input name="shippingCostGbp" type="number" step="0.01" defaultValue="0" />
            </div>
            <div>
              <Label>Actual cost GBP (courier)</Label>
              <Input name="actualCostGbp" type="number" step="0.01" defaultValue="0" />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <SubmitButton pendingText="Adding…">Save shipment</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
