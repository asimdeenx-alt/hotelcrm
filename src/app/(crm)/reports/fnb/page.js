import { Coffee, ReceiptText, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { RangePicker } from "@/components/reports/date-controls";
import { ReportTabs } from "@/components/reports/report-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageSession } from "@/lib/auth";
import { formatDate, formatDateTime, localDateString, localDayRange, safeDateParam } from "@/lib/dates";
import { formatMoney, fullName, humanize } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "F&B sales report" };

const FNB = ["FOOD_BEVERAGE", "MINIBAR"];

export default async function FnbReportPage({ searchParams }) {
  const session = await requirePageSession("reports.daily");
  const prisma = forHotel(session.hotelId);
  const sp = await searchParams;
  const today = localDateString();
  let from = safeDateParam(sp.from, today);
  let to = safeDateParam(sp.to, from);
  if (to < from) [from, to] = [to, from];
  const { start, end } = localDayRange(from, to);
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);

  const [charges, walkIns] = await Promise.all([
    prisma.charge.findMany({
      where: { category: { in: FNB }, createdAt: { gte: start, lt: end } },
      include: { reservation: { select: { id: true, code: true, room: { select: { number: true } }, guest: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    // Walk-in restaurant sales recorded in Accounts as income.
    prisma.accountEntry.findMany({
      where: { type: "INCOME", category: "Restaurant (walk-in)", date: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) } },
      orderBy: { date: "asc" },
    }),
  ]);

  const lineTotal = (c) => Number(c.unitPrice) * c.quantity;
  const roomService = charges.filter((c) => c.category === "FOOD_BEVERAGE").reduce((s, c) => s + lineTotal(c), 0);
  const minibar = charges.filter((c) => c.category === "MINIBAR").reduce((s, c) => s + lineTotal(c), 0);
  const walkInTotal = walkIns.reduce((s, e) => s + Number(e.amount), 0);
  const grand = roomService + minibar + walkInTotal;

  // Day-wise totals
  const days = new Map();
  const bump = (key, field, amount) => {
    const row = days.get(key) ?? { roomService: 0, minibar: 0, walkIn: 0, count: 0 };
    row[field] += amount;
    row.count += 1;
    days.set(key, row);
  };
  for (const c of charges) bump(localDateString(c.createdAt), c.category === "MINIBAR" ? "minibar" : "roomService", lineTotal(c));
  for (const e of walkIns) bump(new Date(e.date).toISOString().slice(0, 10), "walkIn", Number(e.amount));
  const dayRows = [...days.entries()].sort(([a], [b]) => a.localeCompare(b));

  // Item-wise totals
  const items = new Map();
  for (const c of charges) {
    const key = c.description.trim();
    const row = items.get(key) ?? { qty: 0, amount: 0, category: c.category };
    row.qty += c.quantity;
    row.amount += lineTotal(c);
    items.set(key, row);
  }
  const itemRows = [...items.entries()].sort((a, b) => b[1].amount - a[1].amount);
  const rangeLabel = from === to ? formatDate(`${from}T00:00:00Z`) : `${formatDate(`${from}T00:00:00Z`)} – ${formatDate(`${to}T00:00:00Z`)}`;

  return (
    <>
      <PageHeader eyebrow="Reports" title="F&B sales report" description={`Food, beverage and minibar sales · ${rangeLabel}.`}>
        <RangePicker from={from} to={to} />
      </PageHeader>
      <ReportTabs role={session.role} active="/reports/fnb" />

      <div className="hidden print:mb-4 print:block">
        <p className="text-xl font-bold">{settings.hotelName}</p>
        <p className="text-sm">F&B sales report · {rangeLabel}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total F&B sales" value={money(grand)} icon={ReceiptText} tone="brand" />
        <StatCard label="Room service / restaurant (guests)" value={money(roomService)} icon={UtensilsCrossed} tone="emerald" />
        <StatCard label="Minibar" value={money(minibar)} icon={Coffee} tone="amber" />
        <StatCard label="Walk-in restaurant" value={money(walkInTotal)} hint="Recorded in Accounts → Income" icon={ShoppingBag} tone="violet" />
      </div>

      {grand === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No F&B sales in this period"
            description="Post Food & beverage or Minibar charges on a guest folio, or record walk-in restaurant income in Accounts."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="gap-0 pb-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Day-wise sales</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead className="text-right">Guests F&B</TableHead>
                  <TableHead className="text-right">Minibar</TableHead>
                  <TableHead className="text-right">Walk-in</TableHead>
                  <TableHead className="pr-6 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayRows.map(([d, r]) => (
                  <TableRow key={d}>
                    <TableCell className="pl-6">{formatDate(`${d}T00:00:00Z`)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.roomService)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.minibar)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.walkIn)}</TableCell>
                    <TableCell className="pr-6 text-right font-semibold tabular-nums">{money(r.roomService + r.minibar + r.walkIn)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-6">Total</TableCell>
                  <TableCell className="text-right tabular-nums">{money(roomService)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(minibar)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(walkInTotal)}</TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{money(grand)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>

          <Card className="gap-0 pb-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Item-wise sales (guests)</CardTitle>
            </CardHeader>
            {itemRows.length === 0 ? (
              <p className="border-t px-6 py-5 text-sm text-muted-foreground">No guest F&B charges in this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="pr-6 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemRows.map(([name, r]) => (
                    <TableRow key={name}>
                      <TableCell className="pl-6">{name}</TableCell>
                      <TableCell className="text-muted-foreground">{humanize(r.category)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.qty}</TableCell>
                      <TableCell className="pr-6 text-right tabular-nums">{money(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card className="gap-0 pb-0 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">All F&B bills</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Time</TableHead>
                  <TableHead>Room / guest</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="pr-6 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-6 whitespace-nowrap">{formatDateTime(c.createdAt)}</TableCell>
                    <TableCell>
                      Room {c.reservation.room.number} · {fullName(c.reservation.guest)}
                    </TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(c.unitPrice)}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{money(lineTotal(c))}</TableCell>
                  </TableRow>
                ))}
                {walkIns.map((e) => (
                  <TableRow key={`w${e.id}`}>
                    <TableCell className="pl-6 whitespace-nowrap">{formatDate(e.date)}</TableCell>
                    <TableCell className="text-muted-foreground">Walk-in</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{money(e.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}
