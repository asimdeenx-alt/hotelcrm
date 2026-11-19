"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { fullName } from "@/lib/format";

/** Search existing guests by name/email/phone, or switch to entering a new guest. */
export function GuestPicker({ value, onChange, onCreateNew }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/guests?q=${encodeURIComponent(q.trim())}&take=8`, { signal: controller.signal });
        if (res.ok) setResults(await res.json());
      } catch {
        // aborted or offline — ignore
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [q]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <div>
          <p className="font-medium">
            {fullName(value)} {value.vip && <span className="ml-1 text-[10px] font-semibold uppercase text-primary">VIP</span>}
          </p>
          <p className="text-xs text-muted-foreground">{[value.email, value.phone].filter(Boolean).join(" · ") || "No contact details"}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={value.tier} />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Change guest">
            <X />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guests by name, email or phone…"
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={onCreateNew}>
          <UserPlus /> New guest
        </Button>
      </div>
      {loading && <p className="text-xs text-muted-foreground">Searching…</p>}
      {results.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {results.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onChange(g)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted/50"
              >
                <span>
                  <span className="font-medium">{fullName(g)}</span>
                  <span className="ml-2 text-muted-foreground">{g.email || g.phone}</span>
                </span>
                <StatusBadge value={g.tier} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && !loading && results.length === 0 && (
        <p className="text-xs text-muted-foreground">No matching guests — create a new profile instead.</p>
      )}
    </div>
  );
}
