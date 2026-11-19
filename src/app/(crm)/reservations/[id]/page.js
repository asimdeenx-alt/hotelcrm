import Link from "next/link";
import { notFound } from "next/navigation";
import { ChargesPanel, PaymentsPanel } from "@/components/reservations/folio-panels";
import { EditStayDialog } from "@/components/reservations/edit-stay-dialog";
import { ReservationActions } from "@/components/reservations/reservation-actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serialize } from "@/lib/api";
import { requirePageSession } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/dates";
import { computeFolio } from "@/lib/folio";
import { formatMoney, fullName, humanize } from "@/lib/format";
import { can } from "@/lib/permissions";
import { forHotel } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";
import { reservationInclude } from "@/services/reservations";

export const metadata = { title: "Reservation" };

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{children || "—"}</dd>
    </div>
  );
}

export default async function ReservationDetailPage({ params }) {
  const session = await requirePageSession("reservations");
  const prisma = forHotel(session.hotelId);
  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({ where: { id: Number(id) || 0 }, include: reservationInclude });
  if (!reservation) notFound();

  const settings = await getSettings(session.hotelId);
  const folio = computeFolio(reservation, settings.taxRate);
  const r = serialize(reservation);
  const money = (v) => formatMoney(v, settings.currency);
  const open = !["CHECKED_OUT", "CANCELLED", "NO_SHOW"].includes(r.status);
  const canManage = can(session.role, "reservations.manage");
  const canBill = can(session.role, "billing");
  const editable = canManage && ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(r.status);

  return (
    <>
      <PageHeader eyebrow={`Reservation · ${r.code}`} title={fullName(r.guest)}>
        <StatusBadge value={r.status} className="px-3 py-1 text-sm" />
        <Button variant="outline" asChild>
          <Link href={`/reservations/${r.id}/invoice`}>Invoice</Link>
        </Button>
        {editable && <EditStayDialog reservation={r} />}
        {canManage && <ReservationActions reservation={r} balance={folio.balance} role={session.role} currency={settings.currency} />}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Stay</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-3">
                <Detail label="Check-in">{formatDate(r.checkIn)}</Detail>
                <Detail label="Check-out">{formatDate(r.checkOut)}</Detail>
                <Detail label="Nights">{folio.nights}</Detail>
                <Detail label="Room">
                  {r.room.number} · {r.room.roomType.name}
                </Detail>
                <Detail label="Guests">
                  {r.adults} adult{r.adults === 1 ? "" : "s"}
                  {r.children > 0 && `, ${r.children} child${r.children === 1 ? "" : "ren"}`}
                </Detail>
                <Detail label="Source">
                  {r.agent ? (
                    <Link href={`/agents/${r.agent.id}`} className="text-primary hover:underline">
                      {r.agent.name}
                    </Link>
                  ) : (
                    humanize(r.source)
                  )}
                </Detail>
                <Detail label="Nightly rate">{money(r.rate)}</Detail>
                <Detail label="Arrived">{r.actualCheckIn && formatDateTime(r.actualCheckIn)}</Detail>
                <Detail label="Departed">{r.actualCheckOut && formatDateTime(r.actualCheckOut)}</Detail>
                <div className="sm:col-span-3">
                  <Detail label="Special requests">{r.specialRequest}</Detail>
                </div>
              </dl>
            </CardContent>
          </Card>

          <ChargesPanel reservation={r} currency={settings.currency} canEdit={canBill && open} />
          <PaymentsPanel reservation={r} currency={settings.currency} balance={folio.balance} canEdit={canBill && !["CANCELLED", "NO_SHOW"].includes(r.status)} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Folio</CardTitle>
              <StatusBadge value={folio.paymentStatus} />
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <Line label={`Room · ${folio.nights} × ${money(r.rate)}`} value={money(folio.roomTotal)} />
              <Line label="Extras" value={money(folio.extras)} />
              {folio.discount > 0 && <Line label="Discount" value={`− ${money(folio.discount)}`} />}
              <Line label={`Tax (${settings.taxRate}%)`} value={money(folio.tax)} />
              <div className="flex justify-between border-t pt-2.5 font-medium">
                <span>Total</span>
                <span className="tabular-nums">{money(folio.total)}</span>
              </div>
              <Line label="Paid" value={money(folio.paid)} />
              <div className="flex items-baseline justify-between border-t pt-3">
                <span className="text-muted-foreground">Balance due</span>
                <span className={`font-display text-3xl tabular-nums ${folio.balance > 0 ? "text-destructive" : ""}`}>
                  {money(folio.balance)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Guest</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/guests/${r.guest.id}`}>Profile</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={r.guest.tier} />
                {r.guest.vip && <StatusBadge value="VIP" label="VIP" tone="gold" />}
                <StatusBadge value="points" label={`${r.guest.loyaltyPoints} pts`} tone="muted" />
              </div>
              <dl className="grid gap-4">
                <Detail label="Email">{r.guest.email}</Detail>
                <Detail label="Phone">{r.guest.phone}</Detail>
                <Detail label="Preferences">{r.guest.preferences}</Detail>
              </dl>
            </CardContent>
          </Card>

          <p className="px-1 text-xs text-muted-foreground">
            Booked {formatDateTime(r.createdAt)}
            {r.createdBy && ` by ${r.createdBy.name}`}
          </p>
        </div>
      </div>
    </>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
