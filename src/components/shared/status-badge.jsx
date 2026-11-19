import { STATUS_TONES } from "@/lib/constants";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  success: "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  info: "bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-300",
  danger: "bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300",
  muted: "bg-muted text-muted-foreground ring-border",
  gold: "bg-amber-50 text-amber-800 ring-amber-500/30",
  violet: "bg-violet-50 text-violet-800 ring-violet-600/20",
};

export function StatusBadge({ value, label, tone, className }) {
  const t = tone || STATUS_TONES[value] || "muted";
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE_CLASSES[t],
        className
      )}
    >
      {label ?? humanize(value)}
    </span>
  );
}
