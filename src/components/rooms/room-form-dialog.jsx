"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { formToObject, useApi } from "@/hooks/use-api";

/**
 * Add a room (renders its own trigger) or edit one (controlled via open/onOpenChange).
 */
export function RoomFormDialog({ room, roomTypes, open: controlledOpen, onOpenChange }) {
  const { request, pending } = useApi();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const editing = Boolean(room);

  async function onSubmit(event) {
    event.preventDefault();
    const body = formToObject(event.currentTarget);
    try {
      await request(editing ? `/api/rooms/${room.id}` : "/api/rooms", {
        method: editing ? "PATCH" : "POST",
        body,
        success: editing ? "Room updated" : "Room added",
      });
      setOpen(false);
    } catch {}
  }

  async function onDelete() {
    try {
      await request(`/api/rooms/${room.id}`, { method: "DELETE", success: "Room deleted" });
      setOpen(false);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editing && (
        <DialogTrigger asChild>
          <Button>
            <Plus /> Add room
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Edit room ${room.number}` : "Add a room"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Room number" htmlFor="room-number">
            <Input id="room-number" name="number" defaultValue={room?.number ?? ""} required />
          </FormField>
          <FormField label="Floor" htmlFor="room-floor">
            <Input id="room-floor" name="floor" type="number" defaultValue={room?.floor ?? 1} required />
          </FormField>
          <FormField label="Room type" htmlFor="room-type" className="sm:col-span-2">
            <NativeSelect id="room-type" name="roomTypeId" defaultValue={room?.roomTypeId ?? roomTypes[0]?.id}>
              {roomTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · sleeps {t.capacity}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Notes" htmlFor="room-notes" className="sm:col-span-2" hint="Sea view, connecting door, accessible…">
            <Textarea id="room-notes" name="notes" rows={2} defaultValue={room?.notes ?? ""} />
          </FormField>
          <DialogFooter className="sm:col-span-2 sm:justify-between">
            {editing ? (
              <Button type="button" variant="ghost" className="text-destructive" onClick={onDelete} disabled={pending}>
                Delete room
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={pending}>
              {editing ? "Save changes" : "Add room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
