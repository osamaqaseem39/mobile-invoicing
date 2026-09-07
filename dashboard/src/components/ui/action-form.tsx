"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { Notice } from "@/components/notice";

export type ActionResult = { error?: string } | void;

const PendingContext = createContext(false);

/** True while the surrounding ActionForm is waiting on its server action. */
export function useActionPending() {
  return useContext(PendingContext);
}

export function ActionForm({
  action,
  children,
  className,
  id,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Submitting by hand rather than through the `action` prop is the whole
  // point: a rejected save used to redirect back with ?error=, which rebuilt
  // the page and threw away everything already typed. Here the submit is
  // stopped, the action is called directly, and a failure only sets a message
  // — nothing navigates and nothing is re-rendered, so every field (added
  // invoice lines included) keeps exactly what the user put in it.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form id={id} className={className} onSubmit={onSubmit}>
      <PendingContext.Provider value={pending}>
        {error ? <Notice error={error} /> : null}
        {children}
      </PendingContext.Provider>
    </form>
  );
}
