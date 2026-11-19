"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { formToObject, useApi } from "@/hooks/use-api";
import { BOOKING_SOURCES } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { humanize } from "@/lib/format";

export function EditStayDialog({ reservation: r }) {
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);
  const [dates, setDates] = useState({ checkIn: toDateInput(r.checkIn), checkOut: toDateInput(r.checkOut) });
  const [rooms, setRooms] = useState([r.room]);
  const inHouse = r.status === "CHECKED_IN";

  // Load rooms free for the edited dates (plus the current room).
  useEffect(() => {
    if (!open || !dates.checkIn || dates.checkOut <= dates.checkIn) return;
    const controller = new AbortController();
    fetch(`/api/availability?checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => setRooms([r.room, ...list.filter((x) => x.id !== r.room.id)]))
      .catch(() => {});
    return () => controller.abort();
  }, [open, dates.checkIn, dates.checkOut, r.room]);

  async function onSubmit(event) {
    event.preventDefault();
    try {
      await request(`/api/reservations/${r.id}`, { method: "PATCH", body: formToObject(event.currentTarget), success: "Reservation updated" });
      setOpen(false);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit reservation</DialogTitle>
          <DialogDescription>
            {inHouse ? "Guest is in-house: you can extend the stay or move rooms." : "Change dates, room or rate."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Check-in" htmlFor="e-checkIn">
            <Input
              id="e-checkIn"
              name="checkIn"
              type="date"
              value={dates.checkIn}
              readOnly={inHouse}
              onChange={(e) => setDates((d) => ({ ...d, checkIn: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Check-out" htmlFor="e-checkOut">
            <Input
              id="e-checkOut"
              name="checkOut"
              type="date"
              min={dates.checkIn}
              value={dates.checkOut}
              onChange={(e) => setDates((d) => ({ ...d, checkOut: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Room" htmlFor="e-roomId" className="sm:col-span-2">
            <NativeSelect id="e-roomId" name="roomId" defaultValue={r.room.id}>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.number} · {room.roomType?.name}
                  {room.id === r.room.id ? " (current)" : ""}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Adults" htmlFor="e-adults">
            <Input id="e-adults" name="adults" type="number" min={1} defaultValue={r.adults} />
          </FormField>
          <FormField label="Children" htmlFor="e-children">
            <Input id="e-children" name="children" type="number" min={0} defaultValue={r.children} />
          </FormField>
          <FormField label="Nightly rate" htmlFor="e-rate">
            <Input id="e-rate" name="rate" type="number" min={0} step="0.01" defaultValue={r.rate} />
          </FormField>
          <FormField label="Discount (flat)" htmlFor="e-discount">
            <Input id="e-discount" name="discount" type="number" min={0} step="0.01" defaultValue={r.discount} />
          </FormField>
          <FormField label="Source" htmlFor="e-source" className="sm:col-span-2">
            <NativeSelect id="e-source" name="source" defaultValue={r.source}>
              {BOOKING_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Special requests" htmlFor="e-req" className="sm:col-span-2">
            <Textarea id="e-req" name="specialRequest" rows={3} defaultValue={r.specialRequest ?? ""} />
          </FormField>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
