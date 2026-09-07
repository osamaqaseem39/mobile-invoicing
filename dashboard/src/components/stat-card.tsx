import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tones = {
  sky: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-500",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "sky",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <Card className="md:p-6">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          tones[tone],
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-5">
        <span className="text-theme-sm text-gray-500 dark:text-gray-400">{label}</span>
        <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
          {value}
        </h4>
      </div>
    </Card>
  );
}
