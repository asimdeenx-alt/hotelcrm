import Link from "next/link";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/reports", label: "Daily front desk", permission: "reports.daily" },
  { href: "/reports/fnb", label: "F&B sales", permission: "reports.daily" },
  { href: "/reports/overview", label: "Business overview", permission: "reports" },
];

/** Tab strip shared by all report pages; hides tabs the role cannot open. */
export function ReportTabs({ role, active }) {
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/70 print:hidden">
      {TABS.filter((t) => can(role, t.permission)).map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            active === t.href ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
