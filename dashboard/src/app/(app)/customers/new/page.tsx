import { Building2, Hash, Mail, MapPin, Phone, StickyNote, User } from "lucide-react";
import { createCustomer } from "@/actions/customers";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth-guard";

function FieldIcon({ icon: Icon }: { icon: typeof User }) {
  return (
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</h2>
  );
}

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; name?: string; returnTo?: string }>;
}) {
  await requireUser();
  const { error, name, returnTo } = await searchParams;
  return (
    <div className="max-w-4xl">
      <PageHeader title="Add customer" description="Client ID is generated automatically." />
      <Notice error={error} />
      <Card>
        <ActionForm action={createCustomer} className="space-y-6">
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

          <div className="space-y-3">
            <SectionLabel>Contact</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <div className="relative">
                  <FieldIcon icon={User} />
                  <Input
                    id="name"
                    name="name"
                    defaultValue={name ?? ""}
                    required
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="businessName">Business name</Label>
                <div className="relative">
                  <FieldIcon icon={Building2} />
                  <Input id="businessName" name="businessName" className="pl-9" />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <FieldIcon icon={Phone} />
                  <Input id="phone" name="phone" className="pl-9" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <FieldIcon icon={Mail} />
                  <Input id="email" name="email" type="email" className="pl-9" />
                </div>
              </div>
              <div>
                <Label htmlFor="vatNumber">VAT number</Label>
                <div className="relative">
                  <FieldIcon icon={Hash} />
                  <Input id="vatNumber" name="vatNumber" className="pl-9" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-6 dark:border-slate-800">
            <SectionLabel>Addresses</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="address">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    Billing address
                  </span>
                </Label>
                <Textarea id="address" name="address" className="min-h-20" />
              </div>
              <div>
                <Label htmlFor="shippingAddress">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    Shipping address (if different)
                  </span>
                </Label>
                <Textarea id="shippingAddress" name="shippingAddress" className="min-h-20" />
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-6 dark:border-slate-800">
            <Label htmlFor="notes">
              <span className="inline-flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                Notes
              </span>
            </Label>
            <Textarea id="notes" name="notes" />
          </div>

          <SubmitButton pendingText="Adding…">Save customer</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
