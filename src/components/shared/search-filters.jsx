"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Search box + status pills that sync with ?q= and ?status= in the URL. */
export function SearchFilters({ placeholder = "Search…", statuses = [], statusParam = "status" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const current = params.get(statusParam) ?? "";

  function update(next) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`));
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) update({ q });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-9" />
      </div>
      {statuses.length > 0 && (
        <div className={cn("flex flex-wrap gap-1.5", isPending && "opacity-60")}>
          {["", ...statuses].map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => update({ [statusParam]: s })}
              className={cn(
                "rounded-full border bg-white px-3.5 py-1.5 text-xs font-medium transition-colors",
                current === s
                  ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-brand/30"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
              )}
            >
              {s ? humanize(s) : "All"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
