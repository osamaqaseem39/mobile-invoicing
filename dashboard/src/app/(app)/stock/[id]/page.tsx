import Link from "next/link";
import { notFound } from "next/navigation";
import { getStockUnit, updateStockUnit } from "@/actions/stock";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth-guard";
import { ApiError } from "@/lib/api-client";
import { getLookups } from "@/lib/lookups";
import { formatGbp } from "@/lib/money";

export default async function StockUnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { apiToken } = await requireUser();
  const { id } = await params;
  const { ok, error } = await searchParams;
  let unit: Awaited<ReturnType<typeof getStockUnit>>;
  try {
    unit = await getStockUnit(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const lookups = await getLookups(apiToken);

  return (
    <div className="space-y-6">
      <PageHeader
        title={unit.productName}
        description={unit.imei ?? "No IMEI yet"}
        action={{ href: `/stock/add`, label: "Add stock" }}
      />
      <Notice ok={ok} error={error} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs text-slate-500 dark:text-slate-400">Status</div>
          <div className="mt-1">
            <StatusBadge status={unit.status} />
          </div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 dark:text-slate-400">Cost</div>
          <div className="mt-1 font-medium">{formatGbp(unit.costGbp)}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 dark:text-slate-400">Linked invoice</div>
          <div className="mt-1 font-medium">
            {unit.invoice ? (
              <Link className="text-brand-500 hover:underline dark:text-sky-400" href={`/invoices/${unit.invoice.id}`}>
                {unit.invoice.invoiceNumber}
              </Link>
            ) : (
              "—"
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 font-medium">Edit stock unit</h2>
        <form action={updateStockUnit} className="space-y-4">
          <input type="hidden" name="id" value={unit.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="productName">Product name</Label>
              <Input id="productName" name="productName" defaultValue={unit.productName} required />
            </div>
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" name="brand" defaultValue={unit.brand ?? ""} placeholder="Apple" />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input id="color" name="color" list="colors" defaultValue={unit.color} />
              <datalist id="colors">
                {lookups.colors.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="network">Network</Label>
              <Input id="network" name="network" list="networks" defaultValue={unit.network} />
              <datalist id="networks">
                {lookups.networks.map((n) => (
                  <option key={n.id} value={n.name} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="grade">Grade</Label>
              <Input id="grade" name="grade" list="grades" defaultValue={unit.grade} />
              <datalist id="grades">
                {lookups.grades.map((g) => (
                  <option key={g.id} value={g.code} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="costGbp">Cost GBP</Label>
              <Input id="costGbp" name="costGbp" type="number" step="0.01" defaultValue={unit.costGbp} />
            </div>
            <div>
              <Label htmlFor="supplierId">Supplier</Label>
              <Select id="supplierId" name="supplierId" defaultValue={unit.supplierId ?? ""}>
                <option value="">None</option>
                {lookups.suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="imei">IMEI</Label>
              <Input id="imei" name="imei" defaultValue={unit.imei ?? ""} placeholder="15-digit IMEI" />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Status changes (reserved, sold, RMA, faulty) happen automatically from invoices and
            returns, and aren&rsquo;t editable here.
          </p>
          <SubmitButton pendingText="Saving…">Save</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
