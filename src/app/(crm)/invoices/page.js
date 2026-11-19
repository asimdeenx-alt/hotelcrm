import Link from "next/link";
import { CircleDollarSign, FileText, ReceiptText, Wallet } from "lucide-react";
import { RangePicker } from "@/components/reports/date-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilters } from "@/components/shared/search-filters";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageSession } from "@/lib/auth";
import { addDays, formatDate, localDateString, parseDateOnly, safeDateParam } from "@/lib/dates";
import { computeFolio } from "@/lib/folio";
import { formatMoney, fullName } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage({ searchParams }) {
  const session = await requirePageSession("invoices");
  const prisma = forHotel(session.hotelId);
  const sp = await searchParams;
  const today = localDateString();
  let from = safeDateParam(sp.from, `${today.slice(0, 8)}01`);
  let to = safeDateParam(sp.to, today);
  if (to < from) [from, to] = [to, from];
  const status = ["PAID", "PARTIAL", "UNPAID"].includes(sp.status) ? sp.status : "";
  const q = (sp.q ?? "").trim();
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);

  // An invoice exists for every stay that has started; listed by check-out date.
  const reservations = await prisma.reservation.findMany({
    where: {
      status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
      checkOut: { gte: parseDateOnly(from), lt: addDays(parseDateOnly(to), 1) },
      ...(q
        ? {
            OR: [
              { code: { contains: q } },
              { guest: { firstName: { contains: q } } },
              { guest: { lastName: { contains: q } } },
              { room: { number: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { guest: true, room: true, charges: true, payments: true, agent: { select: { name: true } } },
    orderBy: { checkOut: "desc" },
    take: 500,
  });

  const all = reservations.map((r) => ({ ...r, folio: computeFolio(r, settings.taxRate) }));
  const rows = status ? all.filter((r) => r.folio.paymentStatus === status) : all;
  const sum = (key) => all.reduce((s, r) => s + r.folio[key], 0);

  return (
    <>
      <PageHeader eyebrow="Finance" title="Invoices" description="Every guest bill by check-out date. Open one to view or print it.">
        <RangePicker from={from} to={to} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Invoices" value={all.length} icon={FileText} tone="brand" />
        <StatCard label="Billed (incl. tax)" value={money(sum("total"))} icon={ReceiptText} tone="sky" />
        <StatCard label="Received" value={money(sum("paid"))} icon={Wallet} tone="emerald" />
        <StatCard label="Outstanding" value={money(Math.max(0, sum("balance")))} icon={CircleDollarSign} tone="rose" />
      </div>

      <div className="mt-6">
        <SearchFilters placeholder="Search invoice no., guest or room…" statuses={["PAID", "PARTIAL", "UNPAID"]} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No invoices found" description="Try another date range or filter." />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Invoice no.</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Stay</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-5 font-mono text-xs">{r.code}</TableCell>
                  <TableCell>
                    <p className="font-medium">{fullName(r.guest)}</p>
                    {r.agent && <p className="text-xs text-muted-foreground">via {r.agent.name}</p>}
                  </TableCell>
                  <TableCell>{r.room.number}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(r.checkIn)} → {formatDate(r.checkOut)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.folio.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.folio.paid)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${r.folio.balance > 0.009 ? "font-semibold text-rose-600" : ""}`}>
                    {money(r.folio.balance)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={r.folio.paymentStatus} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/reservations/${r.id}/invoice`}>View</Link>
                    </Button>
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
