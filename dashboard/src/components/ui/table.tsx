import { cn } from "@/lib/utils";

export function Table({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full text-left">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-gray-100 dark:border-gray-800">{children}</thead>
  );
}

export function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "border-b border-gray-100 px-4 py-3.5 text-theme-sm text-gray-700 dark:border-gray-800 dark:text-gray-400",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}
