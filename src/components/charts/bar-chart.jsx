"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Single-series vertical bar chart (one hue, no legend — the card title names the series).
 * Hover/focus a column for a tooltip; a visually hidden table carries the same data.
 * @param {{ data: { label: string, value: number, display?: string }[], height?: number, caption: string, labelEvery?: number }} props
 */
export function BarChart({ data, height = 160, caption, labelEvery = 1 }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <figure className="relative">
      <div className="relative" style={{ height }}>
        {/* recessive gridlines at 50% / 100% */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border/70" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border/50" />
        <div className="absolute inset-0 flex items-end gap-0.5" onMouseLeave={() => setActive(null)}>
          {data.map((d, i) => (
            <button
              key={d.label + i}
              type="button"
              className="group relative flex h-full flex-1 items-end outline-none"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${d.label}: ${d.display ?? d.value}`}
            >
              <span
                className={cn(
                  "block w-full rounded-t-[4px] bg-chart-1 transition-opacity",
                  active !== null && active !== i && "opacity-45"
                )}
                style={{ height: `${Math.max(d.value > 0 ? 2 : 0, (d.value / max) * 100)}%` }}
              />
            </button>
          ))}
        </div>
        {active !== null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
          >
            <p className="text-muted-foreground">{data[active].label}</p>
            <p className="font-medium tabular-nums text-foreground">{data[active].display ?? data[active].value}</p>
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-0.5 border-t border-border pt-1.5">
        {data.map((d, i) => (
          <span key={d.label + i} className="flex-1 truncate text-center text-[10px] text-muted-foreground">
            {i % labelEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.label + i}>
              <th scope="row">{d.label}</th>
              <td>{d.display ?? d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
