import { createRma } from "@/actions/rma";
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
import { RMA_ACTIONS } from "@/lib/status";
import { apiClient, ApiError } from "@/lib/api-client";
import { RmaCustomerInvoicePicker } from "@/components/rma-customer-invoice-picker";
import { RmaManualItems } from "@/components/rma-manual-items";

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  customer: { id: string; name: string; clientId: string };
};
type InvoiceWithStock = InvoiceOption & {
  stockUnits: { id: string; imei: string; productName: string; color: string; grade: string }[];
  lines: {
    id: string;
    productName: string;
    color: string;
    grade: string;
    qty: number;
    unitPriceGbp: number;
  }[];
};

export default async function NewRmaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invoiceId?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { error, invoiceId } = await searchParams;
  const invoices = await apiClient.get<InvoiceOption[]>("/invoices", apiToken);
  let selected: InvoiceWithStock | undefined;
  if (invoiceId) {
    try {
      selected = await apiClient.get<InvoiceWithStock>(`/invoices/${invoiceId}`, apiToken);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) throw err;
    }
  }

  return (
    <div>
      <PageHeader
        title="Create RMA"
        description="Type the customer's name, pick their invoice, then select the IMEIs being returned — or add manual items for stock from another invoice."
      />
      <Notice error={error} />
      <Card className="mb-4">
        <RmaCustomerInvoicePicker invoices={invoices} selectedInvoiceId={invoiceId} />
      </Card>

      {selected ? (
        <Card>
          <ActionForm action={createRma} className="space-y-4">
            <input type="hidden" name="invoiceId" value={selected.id} />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {selected.customer.name} · Client {selected.customer.clientId}
            </p>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" name="reason" placeholder="DOA, cosmetic, customer change of mind…" />
            </div>
            <div className="space-y-2">
              <Label>IMEIs</Label>
              {selected.stockUnits.map((unit) => (
                <label
                  key={unit.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"
                >
                  <input type="checkbox" name="stockUnitId" value={unit.id} className="rounded" />
                  <span className="font-mono">{unit.imei}</span>
                  <span>
                    {unit.productName} · {unit.color} · {unit.grade}
                  </span>
                  <Input
                    name={`reason-${unit.id}`}
                    placeholder="e.g. Back glass broken"
                    className="w-56"
                  />
                  <Select name={`action-${unit.id}`} defaultValue="RESTOCK" className="w-40">
                    {RMA_ACTIONS.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
              {!selected.stockUnits.length ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No tracked IMEIs on this invoice yet — pick from its line items below instead.
                </p>
              ) : null}
            </div>
            <RmaManualItems
              defaultInvoiceNumber={selected.invoiceNumber}
              quickAdd={
                !selected.stockUnits.length
                  ? selected.lines.map((line) => ({
                      invoiceNumber: selected.invoiceNumber,
                      productName: line.productName,
                      color: line.color,
                      grade: line.grade,
                      unitPriceGbp: line.unitPriceGbp,
                      qty: line.qty,
                    }))
                  : undefined
              }
            />
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
            <SubmitButton pendingText="Creating…">Create RMA</SubmitButton>
          </ActionForm>
        </Card>
      ) : null}
    </div>
  );
}
