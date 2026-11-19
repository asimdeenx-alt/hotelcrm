import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONES = {
  brand: "bg-brand-tint text-brand ring-brand/15",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
  sky: "bg-sky-50 text-sky-600 ring-sky-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
};

/** KPI tile with a coloured icon chip. `tone` picks the chip colour. */
export function StatCard({ label, value, hint, icon: Icon, tone = "brand", className }) {
  return (
    <Card className={cn("gap-0 border-0 py-0 shadow-sm ring-1 ring-slate-200/70 transition-shadow hover:shadow-md", className)}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{value}</p>
          {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl ring-1", TONES[tone] ?? TONES.brand)}>
            <Icon className="size-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
