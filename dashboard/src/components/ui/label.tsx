import { type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-400",
        className,
      )}
      {...props}
    />
  );
}
