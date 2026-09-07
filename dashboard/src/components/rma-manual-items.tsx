"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RMA_ACTIONS } from "@/lib/status";

export type RmaQuickAddItem = {
  invoiceNumber: string;
  productName: string;
  color: string;
  grade: string;
  unitPriceGbp: number;
  qty: number;
};

type Row = {
  id: number;
  seed?: {
    invoiceNumber: string;
    productName: string;
    color: string;
    grade: string;
    unitPriceGbp: number;
  };
};

export function RmaManualItems({
  defaultInvoiceNumber,
  quickAdd,
}: {
  defaultInvoiceNumber: string;
  quickAdd?: RmaQuickAddItem[];
}) {
  const nextId = useRef(1);
  const [rows, setRows] = useState<Row[]>([]);

  const addRow = (seed?: Row["seed"]) => {
    setRows((current) => [...current, { id: nextId.current++, seed }]);
  };

  return (
    <div className="space-y-3">
      <Label>Manual items (returns from a different invoice, or stock not tracked here)</Label>

      {quickAdd?.length ? (
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            This invoice doesn&rsquo;t have tracked IMEIs yet, so pick from its line items instead —
            click one to add it below, then adjust the IMEI, qty, or reason as needed.
          </p>
          <div className="flex flex-wrap gap-2">
            {quickAdd.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  addRow({
                    invoiceNumber: item.invoiceNumber,
                    productName: item.productName,
                    color: item.color,
                    grade: item.grade,
                    unitPriceGbp: item.unitPriceGbp,
                  })
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-xs hover:border-brand-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <span className="font-medium">{item.productName}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {" "}
                  · {item.color} · {item.grade} · qty {item.qty}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700 sm:grid-cols-4 lg:grid-cols-[0.9fr_1.6fr_1fr_0.8fr_0.6fr_0.9fr_0.9fr_1.4fr] lg:gap-y-1.5"
        >
          <div className="col-span-2 flex justify-end sm:col-span-4 lg:order-last lg:col-span-8">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRows((current) => current.filter((x) => x.id !== row.id))}
            >
              Remove item
            </Button>
          </div>
          <div>
            <Label>Invoice No</Label>
            <Input
              name="manualInvoiceNumber"
              defaultValue={row.seed?.invoiceNumber ?? defaultInvoiceNumber}
            />
          </div>
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <Label>Product name</Label>
            <Input name="manualProductName" defaultValue={row.seed?.productName} required />
          </div>
          <div>
            <Label>IMEI</Label>
            <Input name="manualImei" placeholder="Optional" />
          </div>
          <div>
            <Label>Color</Label>
            <Input name="manualColor" defaultValue={row.seed?.color} />
          </div>
          <div>
            <Label>Grade</Label>
            <Input name="manualGrade" defaultValue={row.seed?.grade} />
          </div>
          <div>
            <Label>Unit price GBP</Label>
            <Input
              name="manualPriceGbp"
              type="number"
              step="0.01"
              defaultValue={row.seed?.unitPriceGbp ?? 0}
            />
          </div>
          <div>
            <Label>Action</Label>
            <Select name="manualAction" defaultValue="RESTOCK">
              {RMA_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <Label>Reason</Label>
            <Input name="manualReason" placeholder="e.g. Back glass broken" />
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={() => addRow()}>
          Add manual item
        </Button>
      </div>
    </div>
  );
}
