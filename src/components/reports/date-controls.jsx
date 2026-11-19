"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function shift(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

function localToday() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function useSetParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (next) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) v ? sp.set(k, v) : sp.delete(k);
    router.replace(`${pathname}?${sp.toString()}`);
  };
}

/** Single-day picker with previous / next / today and a print button. */
export function DayPicker({ date }) {
  const set = useSetParams();
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button variant="outline" size="icon" onClick={() => set({ date: shift(date, -1) })} aria-label="Previous day">
        <ChevronLeft />
      </Button>
      <Input type="date" value={date} onChange={(e) => e.target.value && set({ date: e.target.value })} className="w-auto" />
      <Button variant="outline" size="icon" onClick={() => set({ date: shift(date, 1) })} aria-label="Next day">
        <ChevronRight />
      </Button>
      <Button variant="ghost" onClick={() => set({ date: localToday() })}>
        Today
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer /> Print
      </Button>
    </div>
  );
}

/** Month picker ("YYYY-MM") with print button. */
export function MonthPicker({ month }) {
  const set = useSetParams();
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Input type="month" value={month} onChange={(e) => e.target.value && set({ month: e.target.value })} className="w-auto" aria-label="Month" />
      <Button variant="outline" onClick={() => window.print()}>
        <Printer /> Print
      </Button>
    </div>
  );
}

/** From / to range picker with print button. */
export function RangePicker({ from, to }) {
  const set = useSetParams();
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Input type="date" value={from} max={to} onChange={(e) => e.target.value && set({ from: e.target.value })} className="w-auto" aria-label="From" />
      <span className="text-sm text-muted-foreground">to</span>
      <Input type="date" value={to} min={from} onChange={(e) => e.target.value && set({ to: e.target.value })} className="w-auto" aria-label="To" />
      <Button variant="ghost" onClick={() => set({ from: localToday(), to: localToday() })}>
        Today
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          const t = localToday();
          set({ from: `${t.slice(0, 8)}01`, to: t });
        }}
      >
        This month
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer /> Print
      </Button>
    </div>
  );
}
