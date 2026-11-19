import Link from "next/link";
import { ArrowRight, BedDouble, CalendarCheck, DoorOpen, Sparkles, Wallet } from "lucide-react";
import { BarChart } from "@/components/charts/bar-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageSession } from "@/lib/auth";
import { BLOCKING_STATUSES, ROOM_STATUSES } from "@/lib/constants";
import { addDays, formatDate, todayDateOnly } from "@/lib/dates";
import { formatMoney, fullName } from "@/lib/format";
import { can } from "@/lib/permissions";
import { forHotel } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Dashboard" };

function GuestRow({ r, meta }) {
  return (
    <li>
      <Link
        href={`/reservations/${r.id}`}
        className="flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/50"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {fullName(r.guest)}
            {r.guest.vip && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-primary">VIP</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            Room {r.room.number} · {r.room.roomType.name} · {meta}
          </p>
        </div>
        <StatusBadge value={r.status} />
      </Link>
    </li>
  );
}

export default async function DashboardPage({ searchParams }) {
  const session = await requirePageSession("dashboard");
  const prisma = forHotel(session.hotelId);
  const { denied } = await searchParams;
  const settings = await getSettings(session.hotelId);
  const today = todayDateOnly();
  const tomorrow = addDays(today, 1);
  const horizon = addDays(today, 14);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [rooms, arrivals, departures, inHouse, revenueToday, revenueMonth, openTasks, forecastStays] = await Promise.all([
    prisma.room.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.reservation.findMany({
      where: { status: { in: ["PENDING", "CONFIRMED"] }, checkIn: { lte: today } },
      include: { guest: true, room: { include: { roomType: true } } },
      orderBy: { checkIn: "asc" },
      take: 8,
    }),
    prisma.reservation.findMany({
      where: { status: "CHECKED_IN", checkOut: { lte: today } },
      include: { guest: true, room: { include: { roomType: true } } },
      orderBy: { checkOut: "asc" },
      take: 8,
    }),
    prisma.reservation.count({ where: { status: "CHECKED_IN" } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: startOfToday } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: startOfMonth } } }),
    prisma.housekeepingTask.count({ where: { status: { not: "DONE" } } }),
    prisma.reservation.findMany({
      where: { status: { in: BLOCKING_STATUSES }, checkIn: { lt: horizon }, checkOut: { gt: today } },
      select: { checkIn: true, checkOut: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(ROOM_STATUSES.map((s) => [s, 0]));
  for (const row of rooms) statusCounts[row.status] = row._count._all;
  const totalRooms = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const sellable = totalRooms - statusCounts.OUT_OF_ORDER - statusCounts.MAINTENANCE;
  const occupancy = sellable ? Math.round((inHouse / sellable) * 100) : 0;

  const forecast = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(today, i);
    const booked = forecastStays.filter((s) => s.checkIn <= day && s.checkOut > day).length;
    const pct = sellable ? Math.round((booked / sellable) * 100) : 0;
    return {
      label: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(day),
      value: pct,
      display: `${pct}% · ${booked} of ${sellable} rooms`,
    };
  });

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      {/* Welcome banner */}
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-linear-to-br from-brand-dark via-brand to-brand-light p-6 text-white shadow-lg shadow-brand/25 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 right-32 size-56 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">{formatDate(today)}</p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl">
              {greeting}, {session.name.split(" ")[0]} 👋
            </h1>
            <p className="mt-2 max-w-lg text-sm text-white/85">
              {inHouse} guest{inHouse === 1 ? "" : "s"} in house · {arrivals.length} arrival{arrivals.length === 1 ? "" : "s"} and{" "}
              {departures.length} departure{departures.length === 1 ? "" : "s"} due today.
            </p>
          </div>
          {can(session.role, "reservations.manage") && (
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-white text-brand shadow-md hover:bg-white/90">
                <Link href="/reservations/new">+ New reservation</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/rooms">Room board</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {totalRooms === 0 && can(session.role, "rooms.manage") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Set up your hotel</CardTitle>
            <p className="text-sm text-muted-foreground">Four quick steps and you are ready to take reservations.</p>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["1", "Settings", "Currency, tax rate and contact details", "/settings", "from-brand to-brand-light"],
                ["2", "Room types", "e.g. Deluxe, Balcony, Family Suite with rates", "/rooms/types", "from-sky-500 to-cyan-500"],
                ["3", "Rooms", "Add each room number to a room type", "/rooms", "from-violet-500 to-purple-500"],
                ["4", "Staff", "Create logins for your team", "/staff", "from-amber-500 to-orange-500"],
              ].map(([n, title, text, href, gradient]) => (
                <li key={n}>
                  <Link
                    href={href}
                    className="group flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-light/40 hover:shadow-md"
                  >
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br ${gradient} text-sm font-bold text-white`}>
                      {n}
                    </span>
                    <span>
                      <span className="block font-semibold group-hover:text-primary">{title}</span>
                      <span className="block text-xs text-muted-foreground">{text}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {denied && (
        <p className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-200">
          Your role does not have access to that page.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Occupancy" value={`${occupancy}%`} hint={`${inHouse} of ${sellable} sellable rooms`} icon={BedDouble} tone="brand" />
        <StatCard label="Arrivals due" value={arrivals.length} hint="Expected today or overdue" icon={CalendarCheck} tone="sky" />
        <StatCard label="Departures due" value={departures.length} hint="Checking out today or overdue" icon={DoorOpen} tone="amber" />
        <StatCard
          label="Collected today"
          value={formatMoney(revenueToday._sum.amount, settings.currency)}
          hint={`${formatMoney(revenueMonth._sum.amount, settings.currency)} this month`}
          icon={Wallet}
          tone="rose"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Occupancy forecast · next 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={forecast} caption="Forecast occupancy by night, next 14 days" labelEvery={2} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Room status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ROOM_STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <StatusBadge value={s} />
                <span className="tabular-nums text-muted-foreground">{statusCounts[s]}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="size-4 text-primary" /> Open housekeeping tasks
              </span>
              <span className="tabular-nums">{openTasks}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {[
          { title: "Arrivals", list: arrivals, meta: (r) => `arriving ${formatDate(r.checkIn)}`, empty: "No arrivals due." },
          { title: "Departures", list: departures, meta: (r) => `due out ${formatDate(r.checkOut)}`, empty: "No departures due." },
        ].map((block) => (
          <Card key={block.title} className="gap-0 pb-0">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">{block.title}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/reservations">
                  All <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            {block.list.length ? (
              <ul className="divide-y border-t">
                {block.list.map((r) => (
                  <GuestRow key={r.id} r={r} meta={block.meta(r)} />
                ))}
              </ul>
            ) : (
              <div className="px-6 pb-6">
                <EmptyState title="All clear" description={block.empty} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
