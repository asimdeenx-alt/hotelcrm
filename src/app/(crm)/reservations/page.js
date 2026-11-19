import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilters } from "@/components/shared/search-filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageSession } from "@/lib/auth";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { formatDate, nightsBetween } from "@/lib/dates";
import { formatMoney, fullName, humanize } from "@/lib/format";
import { can } from "@/lib/permissions";
import { forHotel } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Reservations" };

export default async function ReservationsPage({ searchParams }) {
  const session = await requirePageSession("reservations");
  const prisma = forHotel(session.hotelId);
  const { q = "", status = "" } = await searchParams;
  const settings = await getSettings(session.hotelId);
  const query = q.trim();

  const reservations = await prisma.reservation.findMany({
    where: {
      ...(RESERVATION_STATUSES.includes(status) ? { status } : {}),
      ...(query
        ? {
            OR: [
              { code: { contains: query } },
              { guest: { firstName: { contains: query } } },
              { guest: { lastName: { contains: query } } },
              { guest: { email: { contains: query } } },
              { room: { number: { contains: query } } },
            ],
          }
        : {}),
    },
    include: { guest: true, room: { include: { roomType: true } } },
    orderBy: { checkIn: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader eyebrow="Front office" title="Reservations" description="Every booking, past and upcoming.">
        {can(session.role, "reservations.manage") && (
          <Button asChild>
            <Link href="/reservations/new">New reservation</Link>
          </Button>
        )}
      </PageHeader>

      <SearchFilters placeholder="Search code, guest, email or room…" statuses={RESERVATION_STATUSES} />

      {reservations.length === 0 ? (
        <EmptyState title="No reservations found" description="Try a different search or status filter." />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Code</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Stay</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Rate / night</TableHead>
                <TableHead className="pr-5 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-5 font-mono text-xs">
                    <Link href={`/reservations/${r.id}`} className="underline-offset-4 hover:underline">
                      {r.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/reservations/${r.id}`} className="font-medium hover:underline">
                      {fullName(r.guest)}
                    </Link>
                    {r.guest.vip && <span className="ml-2 text-[10px] font-semibold uppercase text-primary">VIP</span>}
                  </TableCell>
                  <TableCell>
                    {r.room.number} <span className="text-muted-foreground">· {r.room.roomType.name}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(r.checkIn)} → {formatDate(r.checkOut)}
                    <span className="text-muted-foreground"> · {nightsBetween(r.checkIn, r.checkOut)}n</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{humanize(r.source)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(r.rate, settings.currency)}</TableCell>
                  <TableCell className="pr-5 text-right">
                    <StatusBadge value={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
