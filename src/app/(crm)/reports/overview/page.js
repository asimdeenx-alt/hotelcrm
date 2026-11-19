import { BarChart3, BedDouble, TrendingUp, Wallet } from "lucide-react";
import { BarChart } from "@/components/charts/bar-chart";
import { ReportTabs } from "@/components/reports/report-tabs";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageSession } from "@/lib/auth";
import { nightsBetween } from "@/lib/dates";
import { formatMoney, humanize, round2 } from "@/lib/format";
import { forHotel } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Reports" };

const MONTHS = 12;

export default async function ReportsPage() {
  const session = await requirePageSession("reports");
  const prisma = forHotel(session.hotelId);
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);

  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth() - (MONTHS - 1), 1));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));

  const [payments, stays, roomCount, sources, roomTypes] = await Promise.all([
    prisma.payment.findMany({ where: { createdAt: { gte: start } }, select: { amount: true, createdAt: true, method: true } }),
    prisma.reservation.findMany({
      where: { status: { in: ["CHECKED_IN", "CHECKED_OUT"] }, checkIn: { lt: end }, checkOut: { gt: start } },
      select: { checkIn: true, checkOut: true, rate: true, room: { select: { roomType: { select: { name: true } } } } },
    }),
    prisma.room.count({ where: { status: { notIn: ["OUT_OF_ORDER"] } } }),
    prisma.reservation.groupBy({
      by: ["source"],
      where: { checkIn: { gte: start }, status: { notIn: ["CANCELLED"] } },
      _count: { _all: true },
    }),
    prisma.roomType.findMany({ select: { name: true } }),
  ]);

  // Monthly buckets.
  const buckets = Array.from({ length: MONTHS }, (_, i) => {
    const from = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
    return { from, to, revenue: 0, roomNights: 0, roomRevenue: 0 };
  });
  for (const p of payments) {
    const b = buckets.find((x) => p.createdAt >= x.from && p.createdAt < x.to);
    if (b) b.revenue += Number(p.amount);
  }
  const byType = Object.fromEntries(roomTypes.map((t) => [t.name, { nights: 0, revenue: 0 }]));
  for (const s of stays) {
    for (const b of buckets) {
      const from = s.checkIn > b.from ? s.checkIn : b.from;
      const to = s.checkOut < b.to ? s.checkOut : b.to;
      const n = nightsBetween(from, to);
      if (to > from && n > 0) {
        b.roomNights += n;
        b.roomRevenue += n * Number(s.rate);
        const t = byType[s.room.roomType.name];
        if (t) {
          t.nights += n;
          t.revenue += n * Number(s.rate);
        }
      }
    }
  }

  const monthLabel = (d) => new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(d);
  const rows = buckets.map((b) => {
    const days = nightsBetween(b.from, b.to);
    const available = roomCount * days;
    return {
      ...b,
      label: monthLabel(b.from),
      occupancy: available ? Math.round((b.roomNights / available) * 100) : 0,
      adr: b.roomNights ? round2(b.roomRevenue / b.roomNights) : 0,
      revpar: available ? round2(b.roomRevenue / available) : 0,
    };
  });

  const current = rows[rows.length - 1];
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalSources = sources.reduce((s, x) => s + x._count._all, 0);

  return (
    <>
      <PageHeader eyebrow="Reports" title="Business overview" description={`Trailing ${MONTHS} months. Revenue is cash collected; ADR and RevPAR use room rates.`} />
      <ReportTabs role={session.role} active="/reports/overview" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected · 12 months" value={money(totalRevenue)} icon={Wallet} tone="emerald" />
        <StatCard label="Occupancy · this month" value={`${current.occupancy}%`} hint={`${current.roomNights} room nights`} icon={BedDouble} tone="brand" />
        <StatCard label="ADR · this month" value={money(current.adr)} hint="Average daily rate" icon={TrendingUp} tone="amber" />
        <StatCard label="RevPAR · this month" value={money(current.revpar)} hint="Revenue per available room" icon={BarChart3} tone="rose" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Revenue collected by month</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              caption="Revenue collected by month"
              data={rows.map((r) => ({ label: r.label, value: r.revenue, display: money(r.revenue) }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Occupancy by month</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              caption="Occupancy percentage by month"
              data={rows.map((r) => ({ label: r.label, value: r.occupancy, display: `${r.occupancy}% · ${r.roomNights} room nights` }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 pb-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Room type performance</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Room type</TableHead>
                <TableHead className="text-right">Room nights</TableHead>
                <TableHead className="pr-6 text-right">Room revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(byType)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([name, t]) => (
                  <TableRow key={name}>
                    <TableCell className="pl-6">{name}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.nights}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{money(t.revenue)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Booking sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sources.length === 0 && <p className="text-sm text-muted-foreground">No bookings in this period.</p>}
            {sources
              .sort((a, b) => b._count._all - a._count._all)
              .map((s) => {
                const pct = totalSources ? Math.round((s._count._all / totalSources) * 100) : 0;
                return (
                  <div key={s.source}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{humanize(s.source)}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {s._count._all} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-chart-1" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 gap-0 pb-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Monthly detail</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Month</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Room nights</TableHead>
              <TableHead className="text-right">Occupancy</TableHead>
              <TableHead className="text-right">ADR</TableHead>
              <TableHead className="pr-6 text-right">RevPAR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...rows].reverse().map((r) => (
              <TableRow key={r.from.toISOString()}>
                <TableCell className="pl-6">
                  {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(r.from)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(r.revenue)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.roomNights}</TableCell>
                <TableCell className="text-right tabular-nums">{r.occupancy}%</TableCell>
                <TableCell className="text-right tabular-nums">{money(r.adr)}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{money(r.revpar)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
