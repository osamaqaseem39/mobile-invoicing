import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: "slate" | "blue" | "green" | "amber" | "red" | "violet";
  className?: string;
}) {
  const tones = {
    slate: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-400",
    blue: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-500",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-500",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-theme-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
