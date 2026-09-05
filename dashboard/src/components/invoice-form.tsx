"use client";

import { useId, useRef, useState } from "react";
import { getAvailableImeis } from "@/actions/stock";
import { getAvailableRmaCredits, type AvailableRmaCredit } from "@/actions/rma";
import { CustomerPicker, type CustomerHit } from "@/components/customer-picker";
import { InvoiceLineProductField, type ProductHit } from "@/components/invoice-line-product-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { GoodsNotReceivedWarning } from "@/components/goods-not-received-warning";
import { Textarea } from "@/components/ui/textarea";
import { formatGbp } from "@/lib/money";
import { rmaCreditSummary, rmaGoodsReceived } from "@/lib/rma";

type Lookup = { id: string; name?: string; code?: string };

type LineSeed = {
  color: string;
  network: string;
  grade: string;
  buyPriceGbp: number;
  imeis: string;
};

const emptySeed: LineSeed = {
  color: "Black",
  network: "Unlocked",
  grade: "A",
  buyPriceGbp: 0,
  imeis: "",
};

function InvoiceLine({
  grades,
  colors,
  networks,
  onRemove,
}: {
  grades: Lookup[];
  colors: Lookup[];
  networks: Lookup[];
  onRemove: () => void;
}) {
  const uid = useId();
  const [productName, setProductName] = useState("");
  const [seed, setSeed] = useState<LineSeed>(emptySeed);
  const [autofillKey, setAutofillKey] = useState(0);
  const [availableImeis, setAvailableImeis] = useState<string[]>([]);
  const [supplierName, setSupplierName] = useState<string | null>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const handleSelect = async (hit: ProductHit) => {
    setProductName(hit.productName);
    setSupplierName(hit.supplierName);
    const qty = Math.max(1, Number(qtyRef.current?.value) || 1);
    // Fetch by product spec only (no supplier filter) so every matching unit
    // in stock is offered here, regardless of which supplier it came from.
    const imeiList = await getAvailableImeis({
      productName: hit.productName,
      color: hit.color,
      network: hit.network,
      grade: hit.grade,
    });
    setAvailableImeis(imeiList);
    setSeed({
      color: hit.color,
      network: hit.network,
      grade: hit.grade,
      buyPriceGbp: hit.costGbp,
      imeis: imeiList.slice(0, qty).join("\n"),
    });
    setAutofillKey((k) => k + 1);
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Line item</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 px-2 text-xs"
        >
          Remove line
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4 lg:grid-cols-[1.6fr_0.9fr_0.9fr_0.55fr_0.5fr_0.85fr_0.85fr_1.5fr] lg:gap-y-1.5">
        <div className="col-span-2 sm:col-span-4 lg:col-span-1">
          <Label className="mb-1">Product name</Label>
          <InvoiceLineProductField
            value={productName}
            onChange={(next) => {
              setProductName(next);
              setSupplierName(null);
            }}
            onSelect={handleSelect}
          />
        </div>
        <div>
          <Label className="mb-1">Color</Label>
          <Input
            key={`color-${autofillKey}`}
            name="lineColor"
            list={`${uid}-colors`}
            defaultValue={seed.color}
          />
          <datalist id={`${uid}-colors`}>
            {colors.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </div>
        <div>
          <Label className="mb-1">Network</Label>
          <Input
            key={`network-${autofillKey}`}
            name="lineNetwork"
            list={`${uid}-networks`}
            defaultValue={seed.network}
          />
          <datalist id={`${uid}-networks`}>
            {networks.map((n) => (
              <option key={n.id} value={n.name} />
            ))}
          </datalist>
        </div>
        <div>
          <Label className="mb-1">Grade</Label>
          <Input
            key={`grade-${autofillKey}`}
            name="lineGrade"
            list={`${uid}-grades`}
            defaultValue={seed.grade}
          />
          <datalist id={`${uid}-grades`}>
            {grades.map((g) => (
              <option key={g.id} value={g.code} />
            ))}
          </datalist>
        </div>
        <div>
          <Label className="mb-1">Qty</Label>
          <Input ref={qtyRef} name="lineQty" type="number" min={1} defaultValue={1} />
        </div>
        <div>
          <Label className="mb-1">Buy £</Label>
          <Input
            key={`buy-gbp-${autofillKey}`}
            name="lineBuyPriceGbp"
            type="number"
            step="0.01"
            defaultValue={seed.buyPriceGbp}
          />
        </div>
        <div>
          <Label className="mb-1">Sell £</Label>
          <Input key={`gbp-${autofillKey}`} name="linePriceGbp" type="number" step="0.01" defaultValue="" />
        </div>
        <div className="col-span-2 sm:col-span-4 lg:col-span-1">
          <Label className="mb-1">IMEIs (optional)</Label>
          <Textarea
            key={`imeis-${autofillKey}`}
            name="lineImeis"
            rows={1}
            className="min-h-11 resize-y"
            placeholder="One 15-digit IMEI per line"
            defaultValue={seed.imeis}
          />
        </div>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        {supplierName ? (
          <span className="font-medium text-slate-500 dark:text-slate-400">Purchased from {supplierName} (internal only, not printed on invoice). </span>
        ) : null}
        Buying price is internal only and never appears on the printed invoice.
        {availableImeis.length
          ? ` ${availableImeis.length} IMEIs available for this spec — pre-filled above, edit to swap, add, or clear.`
          : ""}
      </p>
    </div>
  );
}

export function InvoiceForm({
  grades,
  colors,
  networks,
  initialCustomer,
}: {
  grades: Lookup[];
  colors: Lookup[];
  networks: Lookup[];
  initialCustomer?: CustomerHit | null;
}) {
  const nextLineId = useRef(1);
  const [lineIds, setLineIds] = useState<number[]>([0]);
  const [credits, setCredits] = useState<AvailableRmaCredit[]>([]);
  const [selectedCreditIds, setSelectedCreditIds] = useState<string[]>([]);
  const [installmentPlanEnabled, setInstallmentPlanEnabled] = useState(false);

  return (
    <div className="space-y-6">
      <CustomerPicker
        initial={initialCustomer}
        returnTo="/invoices/new"
        onSelect={(customer) => {
          setSelectedCreditIds([]);
          getAvailableRmaCredits(customer.id).then(setCredits);
        }}
      />
      {credits.length ? (
        <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="font-medium">Available credit notes</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tick a credit note to apply it to this invoice. The full balance is applied by
            default — lower the amount to apply only part of it and leave the rest for a later
            invoice.
          </p>
          {credits.map((credit) => {
            const { totalGbp, appliedGbp, remainingGbp } = rmaCreditSummary(credit);
            const checked = selectedCreditIds.includes(credit.id);
            return (
              <div
                key={credit.id}
                className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0 dark:border-slate-800"
              >
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="appliedRmaIds"
                    value={credit.id}
                    checked={checked}
                    onChange={(event) =>
                      setSelectedCreditIds((current) =>
                        event.target.checked
                          ? [...current, credit.id]
                          : current.filter((id) => id !== credit.id),
                      )
                    }
                  />
                  <span>
                    {credit.rmaNumber} · from Invoice {credit.invoice.invoiceNumber}
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {formatGbp(totalGbp)} total · {formatGbp(appliedGbp)} applied ·{" "}
                      {formatGbp(remainingGbp)} remaining
                    </span>
                    {rmaGoodsReceived(credit) ? null : (
                      <GoodsNotReceivedWarning />
                    )}
                  </span>
                </label>
                {checked ? (
                  <div>
                    <Label htmlFor={`credit-amount-${credit.id}`}>Amount to apply £</Label>
                    <Input
                      id={`credit-amount-${credit.id}`}
                      name={`appliedRmaAmount-${credit.id}`}
                      type="number"
                      step="0.01"
                      min={0.01}
                      max={remainingGbp}
                      defaultValue={remainingGbp}
                      className="w-40"
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="status">Payment status</Label>
          <Select id="status" name="status" defaultValue="PENDING">
            <option value="PENDING">Pending</option>
            <option value="AWAITING_PAYMENT">Awaiting payment</option>
            <option value="PAID">Paid</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="shippingCostGbp">Shipping GBP</Label>
          <Input
            id="shippingCostGbp"
            name="shippingCostGbp"
            type="number"
            step="0.01"
            defaultValue="0"
          />
        </div>
        <div>
          <Label htmlFor="shippingLabel">Shipping line description</Label>
          <Input
            id="shippingLabel"
            name="shippingLabel"
            placeholder="UPS Express Saver / Postage &amp; Packaging"
          />
        </div>
        <div>
          <Label htmlFor="paymentTerms">Payment terms</Label>
          <Input id="paymentTerms" name="paymentTerms" defaultValue="Immediate" />
        </div>
        <div>
          <Label htmlFor="warrantyTerms">Warranty terms</Label>
          <Input id="warrantyTerms" name="warrantyTerms" defaultValue="3 months" />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <h2 className="font-medium">Payment</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="initialPaymentGbp">Payment received now (£)</Label>
            <Input
              id="initialPaymentGbp"
              name="initialPaymentGbp"
              type="number"
              step="0.01"
              min={0}
              defaultValue="0"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="installmentPlanEnabled"
            checked={installmentPlanEnabled}
            onChange={(event) => setInstallmentPlanEnabled(event.target.checked)}
            className="rounded"
          />
          Split the remaining balance into installments
        </label>

        {installmentPlanEnabled ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="installmentCount">Number of installments</Label>
              <Input
                id="installmentCount"
                name="installmentCount"
                type="number"
                min={2}
                defaultValue={3}
              />
            </div>
            <div>
              <Label htmlFor="installmentStartDate">First due date</Label>
              <Input id="installmentStartDate" name="installmentStartDate" type="date" />
            </div>
            <div>
              <Label htmlFor="installmentIntervalDays">Days between installments</Label>
              <Input
                id="installmentIntervalDays"
                name="installmentIntervalDays"
                type="number"
                min={1}
                defaultValue={30}
              />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 sm:col-span-3">
              The remaining balance after the payment above is split evenly across these
              installments, starting on the due date given (defaults to today).
            </p>
          </div>
        ) : null}
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <input
          type="checkbox"
          name="marginVatScheme"
          defaultChecked
          className="mt-0.5 rounded"
        />
        <span>
          <span className="font-medium">Margin VAT Scheme</span> — stock on this invoice is sold
          under the VAT margin scheme. This will be shown prominently on the printed invoice.
          Uncheck if this sale is not under the margin scheme.
        </span>
      </label>

      <div className="space-y-3">
        <h2 className="font-medium">Invoice lines</h2>
        {lineIds.map((lineId) => (
          <InvoiceLine
            key={lineId}
            grades={grades}
            colors={colors}
            networks={networks}
            onRemove={() => setLineIds((current) => current.filter((id) => id !== lineId))}
          />
        ))}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setLineIds((current) => [...current, nextLineId.current++])}
          >
            Add line
          </Button>
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
    </div>
  );
}
