"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const MAIN_ROUTES = new Set([
  "/",
  "/suppliers",
  "/purchase-orders",
  "/stock",
  "/customers",
  "/invoices",
  "/returns",
  "/shipments",
  "/search",
]);

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (MAIN_ROUTES.has(pathname)) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Go back"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.06]"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
