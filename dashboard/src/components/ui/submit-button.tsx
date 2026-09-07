"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { useActionPending } from "@/components/ui/action-form";

export function SubmitButton({
  children,
  pendingText,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  // Forms posting straight to a server action report through useFormStatus;
  // those wrapped in ActionForm submit by hand, so their pending state comes
  // from its context instead.
  const { pending: formPending } = useFormStatus();
  const pending = useActionPending() || formPending;
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (pendingText ?? "Saving…") : children}
    </Button>
  );
}
