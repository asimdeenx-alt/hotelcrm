import { ArrowDownCircle, ArrowUpCircle, Scale, Wallet } from "lucide-react";
import { DeleteEntryButton, EntryDialog } from "@/components/accounts/entry-dialog";
import { RangePicker } from "@/components/reports/date-controls";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageSession } from "@/lib/auth";
import { addDays, formatDate, localDateString, localDayRange, parseDateOnly, safeDateParam } from "@/lib/dates";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatMoney, fullName, humanize, round2 } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Accounts" };

export default async function AccountsPage({ searchParams }) {
  const session = await requirePageSession("accounts");
  const prisma = forHotel(session.hotelId);
  const sp = await searchParams;
  const today = localDateString();
  let from = safeDateParam(sp.from, `${today.slice(0, 8)}01`);
  let to = safeDateParam(sp.to, today);
  if (to < from) [from, to] = [to, from];
  const { start, end } = localDayRange(from, to); // timestamp columns
  const dFrom = parseDateOnly(from); // DATE columns
  const dTo = addDays(parseDateOnly(to), 1);
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);

  const [guestPays, agentPays, supplierPays, salaries, entries] = await Promise.all([
    prisma.payment.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: { reservation: { select: { code: true, guest: { select: { firstName: true, lastName: true } } } } },
    }),
    prisma.agentTransaction.findMany({ where: { type: "PAYMENT", date: { gte: dFrom, lt: dTo } }, include: { agent: { select: { name: true } } } }),
    prisma.supplierPayment.findMany({
      where: { date: { gte: dFrom, lt: dTo } },
      include: { supplier: { select: { name: true } }, bill: { select: { billNo: true } } },
    }),
    prisma.salaryPayment.findMany({ where: { paidOn: { gte: dFrom, lt: dTo } }, include: { employee: { select: { name: true } } } }),
    prisma.accountEntry.findMany({ where: { date: { gte: dFrom, lt: dTo } } }),
  ]);

  // One unified ledger. `sign` +1 = money in, −1 = money out.
  const ledger = [
    ...guestPays.map((p) => ({
      key: `g${p.id}`,
      date: p.createdAt,
      sign: 1,
      category: "Guest payments",
      description: `${fullName(p.reservation.guest)} · ${p.reservation.code}`,
      method: p.method,
      amount: Number(p.amount),
    })),
    ...agentPays.map((t) => ({
      key: `a${t.id}`,
      date: t.date,
      sign: 1,
      category: "Travel agent receipts",
      description: `${t.agent.name}${t.reference ? ` · ${t.reference}` : ""}`,
      method: "BANK_TRANSFER",
      amount: Number(t.amount),
    })),
    ...entries.map((e) => ({
      key: `e${e.id}`,
      entryId: e.id,
      date: e.date,
      sign: e.type === "INCOME" ? 1 : -1,
      category: e.category,
      description: e.description + (e.reference ? ` · ${e.reference}` : ""),
      method: e.method,
      amount: Number(e.amount),
    })),
    ...supplierPays.map((p) => ({
      key: `s${p.id}`,
      date: p.date,
      sign: -1,
      category: "Purchases (suppliers)",
      description: `${p.supplier.name}${p.bill ? ` · bill ${p.bill.billNo}` : ""}`,
      method: p.method,
      amount: Number(p.amount),
    })),
    ...salaries.map((s) => ({
      key: `p${s.id}`,
      date: s.paidOn,
      sign: -1,
      category: "Salaries",
      description: `${s.employee.name} · ${s.month}`,
      method: s.method,
      amount: Number(s.netPay),
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const income = round2(ledger.filter((l) => l.sign > 0).reduce((s, l) => s + l.amount, 0));
  const expense = round2(ledger.filter((l) => l.sign < 0).reduce((s, l) => s + l.amount, 0));
  const profit = round2(income - expense);

  const group = (sign) => {
    const map = new Map();
    for (const l of ledger.filter((x) => x.sign === sign)) map.set(l.category, (map.get(l.category) ?? 0) + l.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };
  const incomeGroups = group(1);
  const expenseGroups = group(-1);
  const byMethod = PAYMENT_METHODS.map((m) => {
    const rows = ledger.filter((l) => l.method === m);
    const inn = rows.filter((l) => l.sign > 0).reduce((s, l) => s + l.amount, 0);
    const out = rows.filter((l) => l.sign < 0).reduce((s, l) => s + l.amount, 0);
    return { method: m, inn, out, net: inn - out };
  });
  const rangeLabel = `${formatDate(dFrom)} – ${formatDate(parseDateOnly(to))}`;

  return (
    <>
      <PageHeader eyebrow="Finance" title="Accounts" description={`Hotel income, expenses and profit · ${rangeLabel}.`}>
        <EntryDialog type="INCOME" />
        <EntryDialog type="EXPENSE" />
      </PageHeader>

      <div className="mb-5 flex justify-end">
        <RangePicker from={from} to={to} />
      </div>

      <div className="hidden print:mb-4 print:block">
        <p className="text-xl font-bold">{settings.hotelName}</p>
        <p className="text-sm">Accounts · {rangeLabel}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total income" value={money(income)} icon={ArrowDownCircle} tone="emerald" />
        <StatCard label="Total expenses" value={money(expense)} icon={ArrowUpCircle} tone="rose" />
        <StatCard label={profit >= 0 ? "Profit" : "Loss"} value={money(Math.abs(profit))} icon={Scale} tone={profit >= 0 ? "brand" : "amber"} />
        <StatCard label="Cash in hand (period)" value={money(byMethod.find((m) => m.method === "CASH").net)} hint="Cash received − cash paid" icon={Wallet} tone="violet" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="gap-0 pb-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Profit & loss</CardTitle>
          </CardHeader>
          <Table>
            <TableBody>
              <TableRow className="bg-emerald-50/60 hover:bg-emerald-50/60">
                <TableCell className="pl-6 font-semibold text-emerald-800" colSpan={2}>
                  Income
                </TableCell>
              </TableRow>
              {incomeGroups.map(([c, v]) => (
                <TableRow key={`i${c}`}>
                  <TableCell className="pl-8">{c}</TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{money(v)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-rose-50/60 hover:bg-rose-50/60">
                <TableCell className="pl-6 font-semibold text-rose-800" colSpan={2}>
                  Expenses
                </TableCell>
              </TableRow>
              {expenseGroups.map(([c, v]) => (
                <TableRow key={`x${c}`}>
                  <TableCell className="pl-8">{c}</TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{money(v)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-6">{profit >= 0 ? "Net profit" : "Net loss"}</TableCell>
                <TableCell className={`pr-6 text-right tabular-nums ${profit < 0 ? "text-rose-600" : "text-emerald-700"}`}>{money(Math.abs(profit))}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>

        <Card className="gap-0 pb-0 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Cash book by payment method</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Method</TableHead>
                <TableHead className="text-right">Money in</TableHead>
                <TableHead className="text-right">Money out</TableHead>
                <TableHead className="pr-6 text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byMethod.map((m) => (
                <TableRow key={m.method}>
                  <TableCell className="pl-6">{humanize(m.method)}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700">{money(m.inn)}</TableCell>
                  <TableCell className="text-right tabular-nums text-rose-600">{money(m.out)}</TableCell>
                  <TableCell className="pr-6 text-right font-semibold tabular-nums">{money(m.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-6">Total</TableCell>
                <TableCell className="text-right tabular-nums">{money(income)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(expense)}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{money(profit)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      </div>

      <Card className="mt-6 gap-0 pb-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">All transactions ({ledger.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Guest payments, agent receipts, supplier payments and salaries are added automatically. Use “Add income / expense” for everything else.
          </p>
        </CardHeader>
        {ledger.length === 0 ? (
          <p className="border-t px-6 py-5 text-sm text-muted-foreground">No transactions in this period.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10 pr-6 print:hidden" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((l) => (
                <TableRow key={l.key}>
                  <TableCell className="pl-6 whitespace-nowrap">{formatDate(l.date)}</TableCell>
                  <TableCell>
                    <StatusBadge value={l.sign > 0 ? "INCOME" : "EXPENSE"} />
                  </TableCell>
                  <TableCell>{l.category}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{l.description}</TableCell>
                  <TableCell className="text-muted-foreground">{humanize(l.method)}</TableCell>
                  <TableCell className={`text-right font-medium tabular-nums ${l.sign > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {l.sign > 0 ? "+" : "−"}
                    {money(l.amount)}
                  </TableCell>
                  <TableCell className="pr-6 print:hidden">{l.entryId && <DeleteEntryButton id={l.entryId} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
