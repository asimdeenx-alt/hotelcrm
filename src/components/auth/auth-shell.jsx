import { BarChart3, BedDouble, CalendarCheck, Hotel, ShieldCheck } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

const FEATURES = [
  [CalendarCheck, "Reservations, check-in & check-out"],
  [BedDouble, "Live room board & housekeeping"],
  [BarChart3, "Billing, invoices & reports"],
  [ShieldCheck, "Private data for every hotel, role-based logins"],
];

/** Two-column layout shared by the sign-in and hotel registration pages. */
export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-linear-to-br from-brand-dark via-brand to-brand-light p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-sm" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-sky-300/20 blur-2xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white text-brand shadow-lg">
            <Hotel className="size-6" />
          </div>
          <span className="text-xl font-bold">{APP_NAME}</span>
        </div>

        <div className="relative">
          <h1 className="max-w-md font-display text-5xl leading-[1.1]">Run your whole hotel from one place.</h1>
          <p className="mt-4 max-w-md text-white/80">Simple for the front desk, powerful for owners and accountants.</p>
          <ul className="mt-8 grid max-w-md gap-3">
            {FEATURES.map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm backdrop-blur-sm">
                <Icon className="size-5 shrink-0 text-amber-300" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} {APP_NAME}</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70 sm:p-10">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-white">
              <Hotel className="size-5" />
            </div>
            <span className="font-bold">{APP_NAME}</span>
          </div>
          <h2 className="font-display text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
