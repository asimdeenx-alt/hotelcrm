import { BedDouble, Moon, Star, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuestFormDialog } from "@/components/guests/guest-form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { serialize } from "@/lib/api";
import { requirePageSession } from "@/lib/auth";
import { formatDate, nightsBetween } from "@/lib/dates";
import { computeFolio } from "@/lib/folio";
import { formatMoney, fullName } from "@/lib/format";
import { can } from "@/lib/permissions";
import { forHotel } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Guest profile" };

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm">{children || "—"}</dd>
    </div>
  );
}

export default async function GuestDetailPage({ params }) {
  const session = await requirePageSession("guests");
  const prisma = forHotel(session.hotelId);
  const { id } = await params;
  const guest = await prisma.guest.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      reservations: {
        include: { room: { include: { roomType: true } }, charges: true, payments: true },
        orderBy: { checkIn: "desc" },
      },
    },
  });
  if (!guest) notFound();
  const settings = await getSettings(session.hotelId);

  const stays = guest.reservations.filter((r) => r.status === "CHECKED_OUT");
  const nights = stays.reduce((sum, r) => sum + nightsBetween(r.checkIn, r.checkOut), 0);
  const lifetime = guest.reservations.reduce((sum, r) => sum + computeFolio(r, settings.taxRate).paid, 0);
  const money = (v) => formatMoney(v, settings.currency);
  const canManage = can(session.role, "guests.manage");

  return (
    <>
      <PageHeader eyebrow="Guest profile" title={fullName(guest)} description={guest.company || undefined}>
        <StatusBadge value={guest.tier} className="px-3 py-1 text-sm" />
        {guest.vip && <StatusBadge value="VIP" label="VIP" tone="gold" className="px-3 py-1 text-sm" />}
        {canManage && <GuestFormDialog guest={serialize(guest)} />}
        {can(session.role, "reservations.manage") && (
          <Button asChild>
            <Link href={`/reservations/new?guestId=${guest.id}`}>Book a stay</Link>
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Completed stays" value={stays.length} icon={BedDouble} tone="brand" />
        <StatCard label="Nights stayed" value={nights} icon={Moon} tone="violet" />
        <StatCard label="Lifetime spend" value={money(lifetime)} icon={Wallet} tone="emerald" />
        <StatCard label="Loyalty points" value={guest.loyaltyPoints.toLocaleString()} icon={Star} tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4">
              <Detail label="Email">{guest.email}</Detail>
              <Detail label="Phone">{guest.phone}</Detail>
              <Detail label="Nationality">{guest.nationality}</Detail>
              <Detail label="Identification">{guest.idType && `${guest.idType} · ${guest.idNumber ?? ""}`}</Detail>
              <Detail label="Date of birth">{guest.dateOfBirth && formatDate(guest.dateOfBirth)}</Detail>
              <Detail label="Address">{guest.address}</Detail>
              <Detail label="Preferences">{guest.preferences}</Detail>
              <Detail label="Internal notes">{guest.notes}</Detail>
              <Detail label="Guest since">{formatDate(guest.createdAt)}</Detail>
            </dl>
          </CardContent>
        </Card>

        <Card className="gap-0 pb-0 lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Stay history</CardTitle>
          </CardHeader>
          {guest.reservations.length === 0 ? (
            <CardContent className="pb-6 text-sm text-muted-foreground">No reservations yet.</CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Code</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-6 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guest.reservations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-6 font-mono text-xs">
                      <Link href={`/reservations/${r.id}`} className="hover:underline">
                        {r.code}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(r.checkIn)} → {formatDate(r.checkOut)}
                    </TableCell>
                    <TableCell>
                      {r.room.number} <span className="text-muted-foreground">· {r.room.roomType.name}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(computeFolio(r, settings.taxRate).total)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <StatusBadge value={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
