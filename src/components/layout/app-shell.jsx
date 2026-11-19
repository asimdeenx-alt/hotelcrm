"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Hotel, LogOut, Menu, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/permissions";
import { humanize, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "./nav-items";

function isActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function useLogout() {
  const router = useRouter();
  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
}

function Sidebar({ session, hotelName, onNavigate }) {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <div className="flex h-full flex-col bg-linear-to-b from-sidebar to-sidebar-2 text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 pb-5 pt-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-md shadow-black/20">
          <Hotel className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold capitalize leading-tight text-white">{hotelName}</p>
          <p className="text-[11px] font-medium text-sidebar-foreground/80">Hotel CRM</p>
        </div>
      </div>

      <nav className="scroll-slim flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => can(session.role, item.permission));
          if (!items.length) return null;
          return (
            <div key={section.label}>
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">{section.label}</p>
              <ul className="space-y-0.5">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onNavigate}
                        className={cn(
                          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-white font-semibold text-brand shadow-md shadow-black/15"
                            : "text-sidebar-foreground hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon className={cn("size-4.5", active ? "text-brand" : "text-sidebar-foreground/70")} />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-brand">
            {initials(session.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold capitalize text-white">{session.name}</p>
            <p className="text-xs text-sidebar-foreground/80">{humanize(session.role)}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="size-8 text-sidebar-foreground hover:bg-white/15 hover:text-white"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ session, hotelName, notice, children }) {
  const [open, setOpen] = useState(false);
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block print:hidden">
        <Sidebar session={session} hotelName={hotelName} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-2xl">
            <Sidebar session={session} hotelName={hotelName} onNavigate={() => setOpen(false)} />
          </aside>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-66 top-4 text-white hover:bg-white/10"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X />
          </Button>
        </div>
      )}

      <div className="lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-10 print:hidden">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold lg:hidden">{hotelName}</p>
            <p className="hidden text-sm text-muted-foreground lg:block">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{session.name}</p>
              <p className="text-xs text-muted-foreground">{humanize(session.role)}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-full bg-linear-to-br bg-brand text-xs font-bold text-white">
              {initials(session.name)}
            </div>
          </div>
        </header>

        {notice && (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl bg-linear-to-r from-amber-50 to-orange-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200 sm:mx-6 lg:mx-10 print:hidden">
            <Sparkles className="size-4 shrink-0 text-amber-500" />
            {notice}
          </div>
        )}
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
