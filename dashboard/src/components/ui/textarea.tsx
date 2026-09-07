import { type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/ui/input";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-24 h-auto", className)} {...props} />;
}
