import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FormField({ label, htmlFor, hint, className, children }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Native <select> styled to match shadcn inputs; works directly with HTML forms. */
export function NativeSelect({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow]",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
