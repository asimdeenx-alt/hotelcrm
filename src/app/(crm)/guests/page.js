import Link from "next/link";
import { GuestFormDialog } from "@/components/guests/guest-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilters } from "@/components/shared/search-filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageSession } from "@/lib/auth";
import { GUEST_TIERS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { fullName } from "@/lib/format";
import { can } from "@/lib/permissions";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Guests" };

export default async function GuestsPage({ searchParams }) {
  const session = await requirePageSession("guests");
  const prisma = forHotel(session.hotelId);
  const { q = "", tier = "" } = await searchParams;
  const query = q.trim();

  const guests = await prisma.guest.findMany({
    where: {
      ...(GUEST_TIERS.includes(tier) ? { tier } : {}),
      ...(query
        ? {
            OR: [
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { email: { contains: query } },
              { phone: { contains: query } },
              { company: { contains: query } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { reservations: true } },
      reservations: { select: { checkOut: true }, where: { status: "CHECKED_OUT" }, orderBy: { checkOut: "desc" }, take: 1 },
    },
    orderBy: [{ vip: "desc" }, { lastName: "asc" }],
    take: 300,
  });

  return (
    <>
      <PageHeader eyebrow="Guest relations" title="Guests" description="Profiles, preferences and loyalty for everyone who stays.">
        {can(session.role, "guests.manage") && <GuestFormDialog />}
      </PageHeader>

      <SearchFilters placeholder="Search name, email, phone or company…" statuses={GUEST_TIERS} statusParam="tier" />

      {guests.length === 0 ? (
        <EmptyState title="No guests found" description="Adjust your search, or add a new guest profile." />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Guest</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Stays</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="pr-5 text-right">Last stay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="pl-5">
                    <Link href={`/guests/${g.id}`} className="font-medium hover:underline">
                      {fullName(g)}
                    </Link>
                    {g.vip && <span className="ml-2 text-[10px] font-semibold uppercase text-primary">VIP</span>}
                    {g.company && <p className="text-xs text-muted-foreground">{g.company}</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <p>{g.email || "—"}</p>
                    <p className="text-xs">{g.phone}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={g.tier} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{g._count.reservations}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.loyaltyPoints.toLocaleString()}</TableCell>
                  <TableCell className="pr-5 text-right text-muted-foreground">
                    {g.reservations[0] ? formatDate(g.reservations[0].checkOut) : "—"}
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
