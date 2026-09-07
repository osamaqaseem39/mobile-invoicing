import Link from "next/link";
import { globalSearch } from "@/actions/search";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth-guard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const { q = "" } = await searchParams;
  const results = await globalSearch(q);

  const sections = [
    {
      title: "Stock / IMEI",
      items: results.stock.map((unit) => ({
        href: "/stock",
        label: `${unit.imei} · ${unit.productName}`,
        meta: `${unit.grade} · ${unit.color} · ${unit.network}`,
        status: unit.status,
      })),
    },
    {
      title: "Invoices",
      items: results.invoices.map((invoice) => ({
        href: `/invoices/${invoice.id}`,
        label: invoice.invoiceNumber,
        meta: `${invoice.customer.clientId} · ${invoice.customer.name}`,
        status: invoice.status,
      })),
    },
    {
      title: "Customers",
      items: results.customers.map((customer) => ({
        href: `/customers/${customer.id}`,
        label: `${customer.clientId} · ${customer.name}`,
        meta: customer.phone || customer.email || customer.businessName || "",
        status: undefined as string | undefined,
      })),
    },
    {
      title: "Purchase orders",
      items: results.purchaseOrders.map((po) => ({
        href: `/purchase-orders/${po.id}`,
        label: po.poNumber,
        meta: po.supplier.name,
        status: po.status,
      })),
    },
    {
      title: "Suppliers",
      items: results.suppliers.map((supplier) => ({
        href: `/suppliers/${supplier.id}`,
        label: supplier.name,
        meta: supplier.phone || supplier.email || "",
        status: undefined as string | undefined,
      })),
    },
    {
      title: "RMAs",
      items: results.rmas.map((rma) => ({
        href: `/returns/${rma.id}`,
        label: rma.rmaNumber,
        meta: `${rma.invoice.invoiceNumber} · ${rma.customer.name}`,
        status: rma.status,
      })),
    },
    {
      title: "Shipments / tracking",
      items: results.shipments.map((shipment) => ({
        href: `/shipments/${shipment.id}`,
        label: shipment.shipmentNumber,
        meta: shipment.trackingNumber || shipment.carrier || shipment.invoice.invoiceNumber,
        status: shipment.status,
      })),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Search"
        description="Find IMEI, invoice, PO, RMA, client ID, customer name, or tracking number."
      />
      <form className="mb-6 max-w-xl">
        <Input name="q" defaultValue={q} placeholder="Search…" />
      </form>
      {!q ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Enter a search term to begin.</p>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.title}>
              <h2 className="mb-3 font-medium">{section.title}</h2>
              {section.items.length ? (
                <ul className="space-y-2 text-sm">
                  {section.items.map((item) => (
                    <li key={item.href + item.label} className="flex justify-between gap-3">
                      <div>
                        <Link className="text-brand-500 hover:underline dark:text-sky-400" href={item.href}>
                          {item.label}
                        </Link>
                        {item.meta ? (
                          <div className="text-xs text-slate-500 dark:text-slate-400">{item.meta}</div>
                        ) : null}
                      </div>
                      {item.status ? <StatusBadge status={item.status} /> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No matches.</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
