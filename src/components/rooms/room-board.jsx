"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { useApi } from "@/hooks/use-api";
import { ROOM_STATUSES } from "@/lib/constants";
import { fullName, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RoomFormDialog } from "./room-form-dialog";

const STRIPE = {
  AVAILABLE: "before:bg-emerald-500",
  OCCUPIED: "before:bg-sky-500",
  CLEANING: "before:bg-amber-500",
  MAINTENANCE: "before:bg-rose-500",
  INSPECTION: "before:bg-violet-500",
  OUT_OF_ORDER: "before:bg-zinc-400",
};

export function RoomBoard({ rooms, roomTypes, canManage, canInspect }) {
  const { request, pending } = useApi();
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null);

  const floors = useMemo(() => {
    const map = new Map();
    for (const room of rooms) {
      if (filter && room.status !== filter) continue;
      if (!map.has(room.floor)) map.set(room.floor, []);
      map.get(room.floor).push(room);
    }
    return [...map.entries()];
  }, [rooms, filter]);

  const counts = useMemo(() => {
    const c = {};
    for (const r of rooms) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rooms]);

  const inspectPass = (room) =>
    request(`/api/rooms/${room.id}/inspect`, {
      method: "POST",
      body: { result: "PASSED" },
      success: `Room ${room.number} inspected and ready`,
    }).catch(() => {});

  const setStatus = (room, status) =>
    request(`/api/rooms/${room.id}`, { method: "PATCH", body: { status }, success: `Room ${room.number}: ${humanize(status)}` }).catch(() => {});

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-1.5">
        {["", ...ROOM_STATUSES].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full border bg-white px-3.5 py-1.5 text-xs font-medium transition-colors",
              filter === s
                ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-brand/30"
                : "text-muted-foreground hover:border-primary/40 hover:text-primary"
            )}
          >
            {s ? humanize(s) : "All"} <span className="opacity-60">{s ? counts[s] ?? 0 : rooms.length}</span>
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {floors.map(([floor, list]) => (
          <section key={floor}>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Floor {floor}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((room) => {
                const stay = room.reservations[0];
                const inHouse = stay?.status === "CHECKED_IN";
                return (
                  <div
                    key={room.id}
                    className={cn(
                      "relative overflow-hidden rounded-lg border bg-card p-4 pl-5 shadow-xs",
                      "before:absolute before:inset-y-0 before:left-0 before:w-1",
                      STRIPE[room.status]
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-2xl leading-none tabular-nums">{room.number}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{room.roomType.name}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="-mr-2 -mt-1 size-7" disabled={pending} aria-label={`Actions for room ${room.number}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {room.status === "INSPECTION" && canInspect && (
                            <>
                              <DropdownMenuLabel>Inspection</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => inspectPass(room)}>✓ Passed — ready for guests</DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href="/housekeeping">✗ Failed — open housekeeping</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuLabel>Set status</DropdownMenuLabel>
                          {ROOM_STATUSES.filter((s) => s !== "OCCUPIED" && s !== room.status).map((s) => (
                            <DropdownMenuItem key={s} disabled={inHouse} onSelect={() => setStatus(room, s)}>
                              {humanize(s)}
                            </DropdownMenuItem>
                          ))}
                          {canManage && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => setEditing(room)}>Edit room</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3">
                      <StatusBadge value={room.status} />
                    </div>
                    <p className="mt-2 h-4 truncate text-xs text-muted-foreground">
                      {stay ? (
                        <Link href={`/reservations/${stay.id}`} className="hover:text-foreground hover:underline">
                          {inHouse ? "In house: " : "Arriving: "}
                          {fullName(stay.guest)}
                          {stay.guest.vip && " ★"}
                        </Link>
                      ) : (
                        room.notes
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {floors.length === 0 && <p className="text-sm text-muted-foreground">No rooms with this status.</p>}
      </div>

      {editing && (
        <RoomFormDialog
          key={editing.id}
          room={editing}
          roomTypes={roomTypes}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </>
  );
}
