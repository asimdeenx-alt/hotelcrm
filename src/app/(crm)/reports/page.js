import Link from "next/link";
import { BedDouble, DoorOpen, LogIn, LogOut, Users, Wallet } from "lucide-react";
import { DayPicker } from "@/components/reports/date-controls";
import { ReportTabs } from "@/components/reports/report-tabs";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageSession } from "@/lib/auth";
import { formatDate, localDayRange, nightsBetween, parseDateOnly, safeDateParam } from "@/lib/dates";
import { computeFolio } from "@/lib/folio";
import { formatMoney, fullName, humanize } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Daily front desk report" };

const time = (v) => (v ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(v)) : "—");

function Section({ title, count, children, empty }) {
  return (
    <Card className="gap-0 pb-0 print:break-inside-avoid print:shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-semibold text-brand">{count}</span>
      </CardHeader>
      {count === 0 ? <p className="border-t px-6 py-5 text-sm text-muted-foreground">{empty}</p> : children}
    </Card>
  );
}

export default async function DailyReportPage({ searchParams }) {
  const session = await requirePageSession("reports.daily");
  const prisma = forHotel(session.hotelId);
  const { date: dateParam } = await searchParams;
  const date = safeDateParam(dateParam);
  const day = parseDateOnly(date);
  const { start, end } = localDayRange(date);
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);
  const include = { guest: true, room: { include: { roomType: true } }, agent: { select: { name: true } } };

  const [checkedIn, checkedOut, expected, dueOut, inHouse, payments] = await Promise.all([
    prisma.reservation.findMany({ where: { actualCheckIn: { gte: start, lt: end } }, include, orderBy: { actualCheckIn: "asc" } }),
    prisma.reservation.findMany({
      where: { actualCheckOut: { gte: start, lt: end } },
      include: { ...include, charges: true, payments: true },
      orderBy: { actualCheckOut: "asc" },
    }),
    prisma.reservation.findMany({ where: { checkIn: day, status: { in: ["PENDING", "CONFIRMED"] } }, include, orderBy: { createdAt: "asc" } }),
    prisma.reservation.findMany({ where: { checkOut: day, status: "CHECKED_IN" }, include, orderBy: { room: { number: "asc" } } }),
    prisma.reservation.count({ where: { status: "CHECKED_IN" } }),
    prisma.payment.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { amount: true, method: true } }),
  ]);

  const byMethod = payments.reduce((acc, p) => ({ ...acc, [p.method]: (acc[p.method] ?? 0) + Number(p.amount) }), {});
  const collected = Object.values(byMethod).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader eyebrow="Reports" title="Daily front desk report" description={`Reception summary for ${formatDate(day)}.`}>
        <DayPicker date={date} />
      </PageHeader>
      <ReportTabs role={session.role} active="/reports" />

      <div className="hidden print:mb-4 print:block">
        <p className="text-xl font-bold">{settings.hotelName}</p>
        <p className="text-sm">Daily front desk report · {formatDate(day)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Checked in" value={checkedIn.length} icon={LogIn} tone="emerald" />
        <StatCard label="Checked out" value={checkedOut.length} icon={LogOut} tone="amber" />
        <StatCard label="Arrivals pending" value={expected.length} icon={Users} tone="sky" />
        <StatCard label="Departures pending" value={dueOut.length} icon={DoorOpen} tone="rose" />
        <StatCard label="In house now" value={inHouse} icon={BedDouble} tone="brand" />
        <StatCard label="Collected" value={money(collected)} icon={Wallet} tone="violet" />
      </div>

      <div className="mt-6 grid gap-6">
        <Section title="Check-ins" count={checkedIn.length} empty="No guests checked in on this day.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Time</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Stay</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="pr-6 text-right">Rate / night</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkedIn.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-6 tabular-nums">{time(r.actualCheckIn)}</TableCell>
                  <TableCell>
                    <Link href={`/reservations/${r.id}`} className="font-medium hover:underline">
                      {fullName(r.guest)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {r.room.number} <span className="text-muted-foreground">· {r.room.roomType.name}</span>
                  </TableCell>
                  <TableCell>
                    {formatDate(r.checkIn)} → {formatDate(r.checkOut)} ({nightsBetween(r.checkIn, r.checkOut)}n)
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.agent?.name ?? humanize(r.source)}</TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{money(r.rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title="Check-outs" count={checkedOut.length} empty="No guests checked out on this day.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Time</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead className="text-right">Bill total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="pr-6 text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkedOut.map((r) => {
                const f = computeFolio(r, settings.taxRate);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="pl-6 tabular-nums">{time(r.actualCheckOut)}</TableCell>
                    <TableCell>
                      <Link href={`/reservations/${r.id}`} className="font-medium hover:underline">
                        {fullName(r.guest)}
                      </Link>
                    </TableCell>
                    <TableCell>{r.room.number}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(f.total)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(f.paid)}</TableCell>
                    <TableCell className={`pr-6 text-right tabular-nums ${f.balance > 0.009 ? "font-semibold text-rose-600" : ""}`}>{money(f.balance)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Expected arrivals (not yet in)" count={expected.length} empty="Everyone due today has arrived.">
            <ul className="divide-y border-t">
              {expected.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-6 py-2.5 text-sm">
                  <Link href={`/reservations/${r.id}`} className="font-medium hover:underline">
                    {fullName(r.guest)} <span className="font-normal text-muted-foreground">· Room {r.room.number}</span>
                  </Link>
                  <StatusBadge value={r.status} />
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Due to check out (still in house)" count={dueOut.length} empty="No pending departures for this day.">
            <ul className="divide-y border-t">
              {dueOut.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-6 py-2.5 text-sm">
                  <Link href={`/reservations/${r.id}`} className="font-medium hover:underline">
                    {fullName(r.guest)} <span className="font-normal text-muted-foreground">· Room {r.room.number}</span>
                  </Link>
                  <StatusBadge value={r.status} />
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <Section title="Collections by payment method" count={payments.length} empty="No payments received on this day.">
          <Table>
            <TableBody>
              {Object.entries(byMethod).map(([method, amount]) => (
                <TableRow key={method}>
                  <TableCell className="pl-6">{humanize(method)}</TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{money(amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-6">Total collected</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{money(collected)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Section>
      </div>
    </>
  );
}
