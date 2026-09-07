"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal, useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-[32px]"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="pt-1">
            <h2 id="confirm-dialog-title" className="text-theme-xl font-semibold text-gray-800 dark:text-white/90">
              {title}
            </h2>
            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmSubmitButton({
  children,
  pendingText,
  confirmMessage,
  confirmTitle = "Are you sure?",
  ...props
}: React.ComponentProps<typeof Button> & {
  pendingText?: string;
  confirmMessage: string;
  confirmTitle?: string;
}) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  return (
    <span ref={containerRef} className="inline-block">
      <Button type="button" disabled={pending} onClick={() => setOpen(true)} {...props}>
        {pending ? (pendingText ?? "Working…") : children}
      </Button>
      <ConfirmDialog
        open={open}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={typeof children === "string" ? children : "Confirm"}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          containerRef.current?.closest("form")?.requestSubmit();
        }}
      />
    </span>
  );
}
