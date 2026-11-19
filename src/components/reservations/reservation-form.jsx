"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { useApi } from "@/hooks/use-api";
import { BOOKING_SOURCES } from "@/lib/constants";
import { addDays, nightsBetween, toDateInput, todayDateOnly } from "@/lib/dates";
import { formatMoney, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GuestPicker } from "./guest-picker";

const EMPTY_GUEST = { firstName: "", lastName: "", email: "", phone: "", nationality: "" };

export function ReservationForm({ currency, initialGuest = null }) {
  const router = useRouter();
  const { request, pending } = useApi();
  const today = todayDateOnly();

  const [stay, setStay] = useState({
    checkIn: toDateInput(today),
    checkOut: toDateInput(addDays(today, 1)),
    adults: 2,
    children: 0,
  });
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [guest, setGuest] = useState(initialGuest);
  const [newGuest, setNewGuest] = useState(null);
  const [details, setDetails] = useState({ source: "WALK_IN", rate: "", discount: "0", status: "CONFIRMED", specialRequest: "", agentId: "" });
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    fetch("/api/agents")
      .then((res) => (res.ok ? res.json() : []))
      .then(setAgents)
      .catch(() => {});
  }, []);

  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const guestsCount = Number(stay.adults) + Number(stay.children);
  const selectedRoom = rooms.find((r) => r.id === roomId);

  useEffect(() => {
    if (!stay.checkIn || !stay.checkOut || stay.checkOut <= stay.checkIn) {
      setRooms([]);
      return;
    }
    const controller = new AbortController();
    setLoadingRooms(true);
    fetch(`/api/availability?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=${guestsCount}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        setRooms(list);
        setRoomId((current) => (list.some((r) => r.id === current) ? current : null));
      })
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
    return () => controller.abort();
  }, [stay.checkIn, stay.checkOut, guestsCount]);

  // Group available rooms by type for a calmer picker.
  const groups = useMemo(() => {
    const map = new Map();
    for (const room of rooms) {
      const key = room.roomType.id;
      if (!map.has(key)) map.set(key, { type: room.roomType, rooms: [] });
      map.get(key).rooms.push(room);
    }
    return [...map.values()];
  }, [rooms]);

  const rate = details.rate !== "" ? Number(details.rate) : Number(selectedRoom?.roomType.baseRate ?? 0);
  const estimate = Math.max(0, nights * rate - Number(details.discount || 0));

  async function onSubmit(event) {
    event.preventDefault();
    const body = {
      ...stay,
      roomId,
      source: details.source,
      agentId: details.agentId || null,
      status: details.status,
      discount: details.discount || 0,
      specialRequest: details.specialRequest,
      ...(details.rate !== "" ? { rate: details.rate } : {}),
      ...(guest ? { guestId: guest.id } : { guest: newGuest }),
    };
    try {
      const created = await request("/api/reservations", { method: "POST", body, success: "Reservation created", refresh: false });
      router.push(`/reservations/${created.id}`);
    } catch {
      // toast already shown
    }
  }

  const canSubmit = roomId && nights > 0 && (guest || (newGuest?.firstName && newGuest?.lastName));

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">1 · Stay</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <FormField label="Check-in" htmlFor="checkIn">
              <Input
                id="checkIn"
                type="date"
                value={stay.checkIn}
                onChange={(e) => {
                  const checkIn = e.target.value;
                  setStay((s) => ({
                    ...s,
                    checkIn,
                    checkOut: s.checkOut <= checkIn && checkIn ? toDateInput(addDays(checkIn, 1)) : s.checkOut,
                  }));
                }}
                required
              />
            </FormField>
            <FormField label="Check-out" htmlFor="checkOut">
              <Input
                id="checkOut"
                type="date"
                min={stay.checkIn}
                value={stay.checkOut}
                onChange={(e) => setStay((s) => ({ ...s, checkOut: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Adults" htmlFor="adults">
              <Input id="adults" type="number" min={1} max={20} value={stay.adults} onChange={(e) => setStay((s) => ({ ...s, adults: e.target.value }))} />
            </FormField>
            <FormField label="Children" htmlFor="children">
              <Input id="children" type="number" min={0} max={20} value={stay.children} onChange={(e) => setStay((s) => ({ ...s, children: e.target.value }))} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">2 · Room</CardTitle>
            <span className="text-xs text-muted-foreground">
              {loadingRooms ? "Checking availability…" : `${rooms.length} available for ${nights} night${nights === 1 ? "" : "s"}`}
            </span>
          </CardHeader>
          <CardContent className="space-y-5">
            {!loadingRooms && rooms.length === 0 && (
              <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                No rooms available for these dates and party size.
              </p>
            )}
            {groups.map(({ type, rooms: list }) => (
              <div key={type.id}>
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-sm font-medium">
                    {type.name} <span className="font-normal text-muted-foreground">· sleeps {type.capacity}</span>
                  </p>
                  <p className="text-sm tabular-nums text-muted-foreground">{formatMoney(type.baseRate, currency)} / night</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {list.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setRoomId(room.id)}
                      className={cn(
                        "min-w-16 rounded-md border px-3 py-2 text-sm tabular-nums transition-colors",
                        roomId === room.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:border-primary/60 hover:bg-primary/5"
                      )}
                      title={room.status !== "AVAILABLE" ? `Currently ${humanize(room.status)}` : undefined}
                    >
                      {room.number}
                      {room.status === "CLEANING" && <span className="ml-1 text-[10px] opacity-70">•</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">3 · Guest</CardTitle>
          </CardHeader>
          <CardContent>
            {newGuest ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["firstName", "First name", true],
                  ["lastName", "Last name", true],
                  ["email", "Email"],
                  ["phone", "Phone"],
                  ["nationality", "Nationality"],
                ].map(([key, label, required]) => (
                  <FormField key={key} label={label} htmlFor={`g-${key}`}>
                    <Input
                      id={`g-${key}`}
                      type={key === "email" ? "email" : "text"}
                      required={required}
                      value={newGuest[key]}
                      onChange={(e) => setNewGuest((g) => ({ ...g, [key]: e.target.value }))}
                    />
                  </FormField>
                ))}
                <div className="flex items-end">
                  <Button type="button" variant="ghost" onClick={() => setNewGuest(null)}>
                    Search existing guests instead
                  </Button>
                </div>
              </div>
            ) : (
              <GuestPicker value={guest} onChange={setGuest} onCreateNew={() => setNewGuest({ ...EMPTY_GUEST })} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">4 · Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Travel agent / OTA" htmlFor="agentId" hint={agents.length ? "Optional — billed to the agent's account later." : "Add agents under Travel agents."}>
              <NativeSelect
                id="agentId"
                value={details.agentId}
                onChange={(e) => {
                  const agentId = e.target.value;
                  setDetails((d) => ({ ...d, agentId, source: agentId && d.source === "WALK_IN" ? "OTA" : d.source }));
                }}
              >
                <option value="">Direct booking (no agent)</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Booking source" htmlFor="source">
              <NativeSelect id="source" value={details.source} onChange={(e) => setDetails((d) => ({ ...d, source: e.target.value }))}>
                {BOOKING_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Status" htmlFor="status">
              <NativeSelect id="status" value={details.status} onChange={(e) => setDetails((d) => ({ ...d, status: e.target.value }))}>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING">Pending (tentative)</option>
              </NativeSelect>
            </FormField>
            <FormField label="Nightly rate" htmlFor="rate" hint="Leave blank to use the room type's base rate.">
              <Input
                id="rate"
                type="number"
                min={0}
                step="0.01"
                placeholder={selectedRoom ? String(selectedRoom.roomType.baseRate) : ""}
                value={details.rate}
                onChange={(e) => setDetails((d) => ({ ...d, rate: e.target.value }))}
              />
            </FormField>
            <FormField label="Discount (flat)" htmlFor="discount">
              <Input
                id="discount"
                type="number"
                min={0}
                step="0.01"
                value={details.discount}
                onChange={(e) => setDetails((d) => ({ ...d, discount: e.target.value }))}
              />
            </FormField>
            <FormField label="Special requests" htmlFor="specialRequest" className="sm:col-span-2">
              <Textarea
                id="specialRequest"
                rows={3}
                value={details.specialRequest}
                onChange={(e) => setDetails((d) => ({ ...d, specialRequest: e.target.value }))}
                placeholder="Late arrival, extra pillows, airport pickup…"
              />
            </FormField>
          </CardContent>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-10 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Nights" value={nights} />
            <Row label="Guests" value={guestsCount} />
            <Row label="Room" value={selectedRoom ? `${selectedRoom.number} · ${selectedRoom.roomType.name}` : "—"} />
            <Row label="Rate" value={selectedRoom ? formatMoney(rate, currency) : "—"} />
            {Number(details.discount) > 0 && <Row label="Discount" value={`− ${formatMoney(details.discount, currency)}`} />}
            <div className="flex items-baseline justify-between border-t pt-3">
              <span className="text-muted-foreground">Estimate (before tax)</span>
              <span className="font-display text-2xl tabular-nums">{formatMoney(estimate, currency)}</span>
            </div>
            <Button type="submit" className="mt-2 h-10 w-full" disabled={!canSubmit || pending}>
              {pending && <Loader2 className="animate-spin" />}
              Confirm reservation
            </Button>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  );
}
