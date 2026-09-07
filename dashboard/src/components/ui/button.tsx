import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 dark:disabled:bg-brand-800",
  secondary:
    "bg-white text-gray-700 ring-1 ring-gray-300 shadow-theme-xs hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]",
  danger:
    "bg-red-500 text-white shadow-theme-xs hover:bg-red-600 disabled:bg-red-300",
  ghost:
    "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
};

const sizes = {
  sm: "h-9 px-3.5 text-theme-xs",
  md: "h-11 px-4 text-theme-sm",
  lg: "h-12 px-5 text-theme-sm",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
