import { type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/ui/input";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputClass, "appearance-none pr-10", className)} {...props}>
      {children}
    </select>
  );
}
