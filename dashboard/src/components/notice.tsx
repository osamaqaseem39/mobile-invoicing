import { CheckCircle2, TriangleAlert } from "lucide-react";

export function Notice({
  error,
  ok,
}: {
  error?: string;
  ok?: string;
}) {
  if (!error && !ok) return null;
  const Icon = error ? TriangleAlert : CheckCircle2;
  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-xl border p-4 ${
        error
          ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
          : "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
      }`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${
          error ? "text-red-500" : "text-emerald-500"
        }`}
      />
      <p
        className={`text-theme-sm ${
          error
            ? "text-red-600 dark:text-red-400"
            : "text-emerald-700 dark:text-emerald-400"
        }`}
      >
        {error ?? ok}
      </p>
    </div>
  );
}
