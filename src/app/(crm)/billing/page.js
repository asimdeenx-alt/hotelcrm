import Link from "next/link";
import { CircleDollarSign, Receipt, Wallet } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageSession } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/dates";
import { computeFolio } from "@/lib/folio";
import { formatMoney, fullName, humanize } from "@/lib/format";
import { forHotel } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const session = await requirePageSession("billing");
  const prisma = forHotel(session.hotelId);
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);

  const [openFolios, recentPayments, closedWithBalance] = await Promise.all([
    prisma.reservation.findMany({
      where: { status: { in: ["CHECKED_IN", "CONFIRMED", "PENDING"] } },
      include: { guest: true, room: true, charges: true, payments: true },
      orderBy: { checkOut: "asc" },
    }),
    prisma.payment.findMany({
      include: { reservation: { include: { guest: true } }, receivedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.reservation.findMany({
      where: { status: "CHECKED_OUT" },
      include: { guest: true, room: true, charges: true, payments: true },
      orderBy: { checkOut: "desc" },
      take: 200,
    }),
  ]);

  const withFolio = (list) => list.map((r) => ({ ...r, folio: computeFolio(r, settings.taxRate) }));
  const inHouse = withFolio(openFolios.filter((r) => r.status === "CHECKED_IN"));
  const deposits = withFolio(openFolios.filter((r) => r.status !== "CHECKED_IN")).filter((r) => r.folio.paid > 0);
  const receivables = withFolio(closedWithBalance).filter((r) => r.folio.balance > 0.009);

  const inHouseOutstanding = inHouse.reduce((s, r) => s + Math.max(0, r.folio.balance), 0);
  const receivableTotal = receivables.reduce((s, r) => s + r.folio.balance, 0);
  const depositTotal = deposits.reduce((s, r) => s + r.folio.paid, 0);

  return (
    <>
      <PageHeader eyebrow="Operations" title="Billing" description="Open folios, receivables and the latest payments." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="In-house balance" value={money(inHouseOutstanding)} hint={`${inHouse.length} open folios`} icon={Receipt} tone="amber" />
        <StatCard label="Receivables after check-out" value={money(receivableTotal)} hint={`${receivables.length} folios`} icon={CircleDollarSign} tone="rose" />
        <StatCard label="Advance deposits held" value={money(depositTotal)} hint={`${deposits.length} upcoming stays`} icon={Wallet} tone="emerald" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <FolioTable title="In-house folios" rows={inHouse} money={money} empty="No guests in house." />
        <FolioTable title="Receivables" rows={receivables} money={money} empty="No unpaid balances after check-out." />
      </div>

      <Card className="mt-6 gap-0 pb-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Recent payments</CardTitle>
        </CardHeader>
        {recentPayments.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState title="No payments yet" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Reservation</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Received by</TableHead>
                <TableHead className="pr-6 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-6 whitespace-nowrap">{formatDateTime(p.createdAt)}</TableCell>
                  <TableCell>{fullName(p.reservation.guest)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/reservations/${p.reservationId}`} className="hover:underline">
                      {p.reservation.code}
                    </Link>
                  </TableCell>
                  <TableCell>{humanize(p.method)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.receivedBy?.name ?? "—"}</TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{money(p.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}

function FolioTable({ title, rows, money, empty }) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      {rows.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Guest</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Departs</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="pr-6 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pl-6">
                  <Link href={`/reservations/${r.id}`} className="font-medium hover:underline">
                    {fullName(r.guest)}
                  </Link>
                </TableCell>
                <TableCell>{r.room.number}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(r.checkOut)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(r.folio.total)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(r.folio.balance)}</TableCell>
                <TableCell className="pr-6 text-right">
                  <StatusBadge value={r.folio.paymentStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
