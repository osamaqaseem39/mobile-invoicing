import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex h-11 items-center rounded-lg bg-brand-500 px-4 text-theme-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
