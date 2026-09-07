import { Hash, Mail, MapPin, Phone, StickyNote, User } from "lucide-react";
import { createSupplier } from "@/actions/suppliers";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth-guard";

function FieldIcon({ icon: Icon }: { icon: typeof User }) {
  return (
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof User;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-6 py-5 dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500 dark:bg-sky-500/10 dark:text-sky-400">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <p className="text-[12.5px] text-slate-400 dark:text-slate-500">{description}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

export default async function NewSupplierPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Add supplier"
        description="Suppliers appear as pick options when creating purchase orders."
      />
      <Notice error={error} />
      <ActionForm action={createSupplier} className="space-y-5">
        <Section icon={User} title="Contact" description="Who to reach for orders and queries">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <div className="relative">
                <FieldIcon icon={User} />
                <Input id="name" name="name" required className="pl-9" />
              </div>
            </div>
            <div>
              <Label htmlFor="vatNumber">VAT number</Label>
              <div className="relative">
                <FieldIcon icon={Hash} />
                <Input id="vatNumber" name="vatNumber" className="pl-9" />
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
          </div>
        </Section>

        <Section icon={MapPin} title="Address" description="Used on purchase orders and correspondence">
          <Textarea id="address" name="address" />
        </Section>

        <Section icon={StickyNote} title="Notes" description="Internal only — not shown to the supplier">
          <Textarea id="notes" name="notes" />
        </Section>

        <div className="flex justify-end">
          <SubmitButton pendingText="Adding…">Save supplier</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
