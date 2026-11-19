"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { useApi } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/dates";

const CHECKLIST = ["Bed made, linen fresh", "Bathroom clean & stocked", "Floor & surfaces dust-free", "Minibar / amenities refilled", "AC, TV, lights working"];

/** Rooms waiting for inspection, with pass / fail actions and the recent inspection log. */
export function InspectionPanel({ rooms, recent, canInspect }) {
  const { request, pending } = useApi();
  const [failing, setFailing] = useState(null);
  const [notes, setNotes] = useState("");

  const inspect = (room, result, failNotes) =>
    request(`/api/rooms/${room.id}/inspect`, {
      method: "POST",
      body: { result, notes: failNotes },
      success: result === "PASSED" ? `Room ${room.number} is ready for guests` : `Room ${room.number} sent back for re-cleaning`,
    });

  return (
    <div className="mb-6 grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardCheck className="size-5 text-violet-600" /> Awaiting inspection
          </CardTitle>
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">{rooms.length}</span>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rooms waiting. Rooms appear here when housekeeping marks their cleaning done.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">Checklist: {CHECKLIST.join(" · ")}</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {rooms.map((room) => (
                  <li key={room.id} className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3">
                    <div>
                      <p className="text-lg font-bold tabular-nums">Room {room.number}</p>
                      <p className="text-xs text-muted-foreground">{room.roomType.name}</p>
                    </div>
                    {canInspect ? (
                      <div className="flex gap-1.5">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={pending} onClick={() => inspect(room, "PASSED").catch(() => {})}>
                          <CheckCircle2 /> Pass
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          disabled={pending}
                          onClick={() => {
                            setNotes("");
                            setFailing(room);
                          }}
                        >
                          <XCircle /> Fail
                        </Button>
                      </div>
                    ) : (
                      <StatusBadge value="INSPECTION" />
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 pb-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Recent inspections</CardTitle>
        </CardHeader>
        {recent.length === 0 ? (
          <CardContent className="pb-6 text-sm text-muted-foreground">No inspections in the last 7 days.</CardContent>
        ) : (
          <ul className="divide-y border-t">
            {recent.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-2 px-6 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">Room {i.room.number}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDateTime(i.createdAt)}
                    {i.inspectedBy && ` · ${i.inspectedBy.name}`}
                  </p>
                  {i.notes && <p className="mt-0.5 text-xs text-rose-700">{i.notes}</p>}
                </div>
                <StatusBadge value={i.result} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={Boolean(failing)} onOpenChange={(o) => !o && setFailing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fail inspection · Room {failing?.number}</DialogTitle>
            <DialogDescription>The room goes back to cleaning and an urgent re-clean task is created.</DialogDescription>
          </DialogHeader>
          <FormField label="What needs fixing?" htmlFor="fail-notes">
            <Textarea id="fail-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bathroom mirror stained, towels missing…" />
          </FormField>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={pending || !notes.trim()}
              onClick={async () => {
                try {
                  await inspect(failing, "FAILED", notes.trim());
                  setFailing(null);
                } catch {}
              }}
            >
              Fail & send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
