import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileListRow({
  href,
  title,
  subtitle,
  trailing,
  meta,
  className,
}: {
  href?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{title}</div>
        {subtitle ? (
          <div className="mt-0.5 truncate text-theme-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
        ) : null}
      </div>
      {trailing || meta ? (
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          {trailing}
          {meta ? <div className="text-theme-xs text-gray-500 dark:text-gray-400">{meta}</div> : null}
        </div>
      ) : null}
      {href ? <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-600" /> : null}
    </>
  );

  if (!href) {
    return (
      <div className={cn("flex items-center gap-3 px-4 py-3", className)}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors active:bg-gray-50 dark:active:bg-white/[0.03]",
        className,
      )}
    >
      {content}
    </Link>
  );
}
