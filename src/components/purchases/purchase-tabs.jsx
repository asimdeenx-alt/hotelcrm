import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/purchases", label: "Purchase bills" },
  { href: "/purchases/suppliers", label: "Suppliers & dues" },
];

export function PurchaseTabs({ active }) {
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/70 print:hidden">
      {TABS.map((t) => (
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
