"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getInvoicePreview } from "@/actions/invoices";
import { CustomerPicker, type CustomerHit } from "@/components/customer-picker";
import { InvoiceDocument, type InvoiceDoc } from "@/components/invoice-document";

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  customer: { id: string; name: string; clientId: string };
};

function InvoicePreviewModal({
  invoice,
  loading,
  onClose,
}: {
  invoice: InvoiceDoc | null;
  loading: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full border border-gray-200 bg-white p-1.5 text-gray-500 shadow-theme-xs hover:text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <X size={16} />
        </button>
        <div className="max-h-[85vh] overflow-y-auto rounded-xl">
          {loading || !invoice ? (
            <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading invoice…
            </p>
          ) : (
            <InvoiceDocument invoice={invoice} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function RmaCustomerInvoicePicker({
  invoices,
  selectedInvoiceId,
}: {
  invoices: InvoiceOption[];
  selectedInvoiceId?: string;
}) {
  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceDoc | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const customerInvoices = customer
    ? invoices.filter((invoice) => invoice.customer.id === customer.id)
    : [];

  const openPreview = (id: string) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewInvoice(null);
    getInvoicePreview(id)
      .then(setPreviewInvoice)
      .finally(() => setPreviewLoading(false));
  };

  return (
    <div className="space-y-4">
      <CustomerPicker name="rmaCustomerId" onSelect={setCustomer} />
      {customer ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Invoices for {customer.name}
          </p>
          {customerInvoices.length ? (
            <div className="flex flex-wrap gap-2">
              {customerInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/returns/new?invoiceId=${invoice.id}`}
                  onClick={() => openPreview(invoice.id)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    invoice.id === selectedInvoiceId
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                  }`}
                >
                  {invoice.invoiceNumber}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This customer has no invoices yet.
            </p>
          )}
        </div>
      ) : null}
      {previewOpen ? (
        <InvoicePreviewModal
          invoice={previewInvoice}
          loading={previewLoading}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}
