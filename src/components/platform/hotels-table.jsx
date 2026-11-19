"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { formToObject, useApi } from "@/hooks/use-api";
import { formatDate, toDateInput } from "@/lib/dates";
import { hotelAccess } from "@/lib/hotel-access";
import { humanize } from "@/lib/format";

function accessBadge(hotel) {
  const { allowed, daysLeft } = hotelAccess(hotel);
  if (hotel.status === "SUSPENDED") return <StatusBadge value="SUSPENDED" tone="danger" />;
  if (!allowed) return <StatusBadge value="EXPIRED" label="Expired" tone="danger" />;
  if (hotel.status === "TRIAL") return <StatusBadge value="TRIAL" label={`Trial · ${daysLeft}d left`} tone="warning" />;
  return <StatusBadge value="ACTIVE" label="Active" tone="success" />;
}

export function HotelsTable({ hotels }) {
  const { request, pending } = useApi();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return hotels;
    return hotels.filter((h) =>
      [h.name, h.email, h.users[0]?.name, h.users[0]?.email].some((v) => v?.toLowerCase().includes(term))
    );
  }, [hotels, q]);

  const act = (hotel, body, message) =>
    request(`/api/platform/hotels/${hotel.id}`, { method: "PATCH", body, success: `${hotel.name}: ${message}` }).catch(() => {});

  async function onSave(event) {
    event.preventDefault();
    const body = formToObject(event.currentTarget);
    try {
      await request(`/api/platform/hotels/${editing.id}`, { method: "PATCH", body, success: "Hotel updated" });
      setEditing(null);
    } catch {}
  }

  return (
    <>
      <div className="relative mb-4 w-full md:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hotel, owner or email…" className="pl-9" />
      </div>

      {list.length === 0 ? (
        <EmptyState title="No hotels yet" description="Hotels appear here as soon as they register at /signup." />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Hotel</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead className="text-right">Rooms</TableHead>
                <TableHead className="text-right">Staff</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="pl-5">
                    <p className="font-medium">{h.name}</p>
                    {h.phone && <p className="text-xs text-muted-foreground">{h.phone}</p>}
                  </TableCell>
                  <TableCell>
                    <p>{h.users[0]?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{h.users[0]?.email ?? h.email}</p>
                  </TableCell>
                  <TableCell>{h.plan}</TableCell>
                  <TableCell>{accessBadge(h)}</TableCell>
                  <TableCell className="text-muted-foreground">{h.subscriptionEndsAt ? formatDate(h.subscriptionEndsAt) : "No expiry"}</TableCell>
                  <TableCell className="text-right tabular-nums">{h._count.rooms}</TableCell>
                  <TableCell className="text-right tabular-nums">{h._count.users}</TableCell>
                  <TableCell className="text-right tabular-nums">{h._count.reservations}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(h.createdAt)}</TableCell>
                  <TableCell className="pr-5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={pending} aria-label={`Actions for ${h.name}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Subscription</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => act(h, { status: "ACTIVE", plan: "Monthly", extendDays: 30 }, "activated for 1 month")}>
                          Activate · 1 month
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => act(h, { status: "ACTIVE", plan: "Yearly", extendDays: 365 }, "activated for 1 year")}>
                          Activate · 1 year
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => act(h, { status: "TRIAL", extendDays: 14 }, "trial extended by 14 days")}>
                          Extend trial · 14 days
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setEditing(h)}>Edit plan, date & notes…</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {h.status === "SUSPENDED" ? (
                          <DropdownMenuItem onSelect={() => act(h, { status: "ACTIVE" }, "reactivated")}>Reactivate</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem variant="destructive" onSelect={() => act(h, { status: "SUSPENDED" }, "suspended")}>
                            Suspend access
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
            <DialogDescription>Owner: {editing?.users[0]?.email ?? editing?.email ?? "—"}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form key={editing.id} onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Status" htmlFor="h-status">
                <NativeSelect id="h-status" name="status" defaultValue={editing.status}>
                  {["TRIAL", "ACTIVE", "SUSPENDED"].map((s) => (
                    <option key={s} value={s}>
                      {humanize(s)}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Plan" htmlFor="h-plan">
                <Input id="h-plan" name="plan" defaultValue={editing.plan} required placeholder="Monthly, Yearly, Pro…" />
              </FormField>
              <FormField label="Valid until" htmlFor="h-ends" className="sm:col-span-2" hint="Leave empty for no expiry.">
                <Input id="h-ends" name="subscriptionEndsAt" type="date" defaultValue={toDateInput(editing.subscriptionEndsAt)} />
              </FormField>
              <FormField label="Internal notes" htmlFor="h-notes" className="sm:col-span-2" hint="Only visible to you — payments, contacts, agreements.">
                <Textarea id="h-notes" name="notes" rows={3} defaultValue={editing.notes ?? ""} />
              </FormField>
              <DialogFooter className="sm:col-span-2">
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
