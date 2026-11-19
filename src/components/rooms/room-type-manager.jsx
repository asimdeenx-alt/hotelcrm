"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { formToObject, useApi } from "@/hooks/use-api";
import { formatMoney } from "@/lib/format";

export function RoomTypeManager({ types, currency }) {
  const { request, pending } = useApi();
  const [editing, setEditing] = useState(null); // null = closed, {} = new, type = edit

  async function onSubmit(event) {
    event.preventDefault();
    const isNew = !editing.id;
    try {
      await request(isNew ? "/api/room-types" : `/api/room-types/${editing.id}`, {
        method: isNew ? "POST" : "PATCH",
        body: formToObject(event.currentTarget),
        success: isNew ? "Room type created" : "Room type updated",
      });
      setEditing(null);
    } catch {}
  }

  async function onDelete() {
    try {
      await request(`/api/room-types/${editing.id}`, { method: "DELETE", success: "Room type deleted" });
      setEditing(null);
    } catch {}
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({})}>
          <Plus /> New room type
        </Button>
      </div>

      {types.length === 0 ? (
        <EmptyState title="No room types" description="Create categories like Deluxe King or Junior Suite." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {types.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">{t.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sleeps {t.capacity} · {t._count.rooms} room{t._count.rooms === 1 ? "" : "s"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}>
                  <Pencil className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-display text-3xl tabular-nums">
                  {formatMoney(t.baseRate, currency)} <span className="font-sans text-sm text-muted-foreground">/ night</span>
                </p>
                {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                {t.amenities && (
                  <div className="flex flex-wrap gap-1.5">
                    {t.amenities
                      .split(",")
                      .map((a) => a.trim())
                      .filter(Boolean)
                      .map((a) => (
                        <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {a}
                        </span>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Edit ${editing.name}` : "New room type"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form key={editing.id ?? "new"} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name" htmlFor="rt-name" className="sm:col-span-2">
                <Input id="rt-name" name="name" defaultValue={editing.name ?? ""} required />
              </FormField>
              <FormField label="Base rate / night" htmlFor="rt-rate">
                <Input id="rt-rate" name="baseRate" type="number" min="0" step="0.01" defaultValue={editing.baseRate ?? ""} required />
              </FormField>
              <FormField label="Capacity" htmlFor="rt-cap">
                <Input id="rt-cap" name="capacity" type="number" min="1" max="20" defaultValue={editing.capacity ?? 2} required />
              </FormField>
              <FormField label="Description" htmlFor="rt-desc" className="sm:col-span-2">
                <Textarea id="rt-desc" name="description" rows={2} defaultValue={editing.description ?? ""} />
              </FormField>
              <FormField label="Amenities" htmlFor="rt-amen" className="sm:col-span-2" hint="Comma separated, e.g. King bed, Balcony, Rain shower">
                <Input id="rt-amen" name="amenities" defaultValue={editing.amenities ?? ""} />
              </FormField>
              <DialogFooter className="sm:col-span-2 sm:justify-between">
                {editing.id ? (
                  <Button type="button" variant="ghost" className="text-destructive" onClick={onDelete} disabled={pending}>
                    Delete
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={pending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
