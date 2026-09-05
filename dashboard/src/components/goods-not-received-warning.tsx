/**
 * Shown wherever RMA credit can be spent, when the returned goods are not back yet.
 * The credit is still usable on purpose — this only makes the risk visible first.
 */
export function GoodsNotReceivedWarning({ variant = "inline" }: { variant?: "inline" | "block" }) {
  if (variant === "block") {
    return (
      <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
        ⚠ Goods not received yet — this return is still open. Applying the credit now means
        discounting an invoice before the stock is back.
      </p>
    );
  }

  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
      ⚠ Goods not received yet
    </span>
  );
}
