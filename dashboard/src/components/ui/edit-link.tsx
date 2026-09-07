"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export function EditLink({
  href,
  label = "Edit",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-brand-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-brand-400",
        className,
      )}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Link>
  );
}
