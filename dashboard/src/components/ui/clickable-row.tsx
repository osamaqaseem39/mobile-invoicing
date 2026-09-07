"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function ClickableRow({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(href)}
      className={cn(
        "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]",
        className,
      )}
    >
      {children}
    </tr>
  );
}
