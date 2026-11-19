"use client";

import { useMemo, useState } from "react";
import { CheckCheck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "PRESENT", short: "P", label: "Present", on: "bg-emerald-600 text-white border-emerald-600" },
  { value: "ABSENT", short: "A", label: "Absent", on: "bg-rose-600 text-white border-rose-600" },
  { value: "HALF_DAY", short: "½", label: "Half day", on: "bg-amber-500 text-white border-amber-500" },
  { value: "LEAVE", short: "L", label: "Paid leave", on: "bg-sky-600 text-white border-sky-600" },
  { value: "HOLIDAY", short: "H", label: "Holiday / week off", on: "bg-slate-500 text-white border-slate-500" },
];

/** One-day attendance for all working employees. */
export function AttendanceSheet({ date, employees, marks }) {
  const { request, pending } = useApi();
  const [state, setState] = useState(() => ({ ...marks }));
  const dirty = useMemo(() => employees.some((e) => (state[e.id] ?? null) !== (marks[e.id] ?? null)), [employees, state, marks]);
  const counts = OPTIONS.map((o) => ({ ...o, n: employees.filter((e) => state[e.id] === o.value).length }));

  async function save() {
    try {
      await request("/api/attendance", {
        method: "PUT",
        body: { date, records: employees.map((e) => ({ employeeId: e.id, status: state[e.id] ?? null })) },
        success: "Attendance saved",
      });
    } catch {}
  }

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Mark attendance</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {counts.map((c) => `${c.label}: ${c.n}`).join(" · ")} · Not marked: {employees.length - counts.reduce((s, c) => s + c.n, 0)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setState((s) => Object.fromEntries(employees.map((e) => [e.id, s[e.id] ?? "PRESENT"])))}
          >
            <CheckCheck /> Mark rest present
          </Button>
          <Button size="sm" onClick={save} disabled={pending || !dirty}>
            <Save /> Save
          </Button>
        </div>
      </CardHeader>
      <ul className="divide-y border-t">
        {employees.map((e) => (
          <li key={e.id} className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{e.name}</p>
              <p className="text-xs text-muted-foreground">
                {[e.designation, e.department].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex gap-1.5" role="radiogroup" aria-label={`Attendance for ${e.name}`}>
              {OPTIONS.map((o) => {
                const on = state[e.id] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    title={o.label}
                    onClick={() => setState((s) => ({ ...s, [e.id]: on ? null : o.value }))}
                    className={cn(
                      "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold transition-colors",
                      on ? o.on : "bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {o.short}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
