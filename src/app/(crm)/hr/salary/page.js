import Link from "next/link";
import { Banknote, CircleDollarSign, Users, Wallet } from "lucide-react";
import { PaySalaryDialog, UndoSalaryButton } from "@/components/hr/salary-actions";
import { MonthPicker } from "@/components/reports/date-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageSession } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { formatMoney, humanize } from "@/lib/format";
import { computeSalary, monthRange, safeMonthParam } from "@/lib/salary";
import { getSettings } from "@/lib/settings";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Salary" };

export default async function SalaryPage({ searchParams }) {
  const session = await requirePageSession("salary");
  const prisma = forHotel(session.hotelId);
  const sp = await searchParams;
  const month = safeMonthParam(sp.month);
  const { start, end } = monthRange(month);
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);
  const monthName = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(start);

  const [employees, records, payments] = await Promise.all([
    prisma.employee.findMany({ orderBy: [{ department: "asc" }, { name: "asc" }] }),
    prisma.attendance.findMany({ where: { date: { gte: start, lt: end } }, select: { employeeId: true, status: true } }),
    prisma.salaryPayment.findMany({ where: { month } }),
  ]);

  const paidBy = new Map(payments.map((p) => [p.employeeId, p]));
  // Working employees, plus anyone who left but was already paid for this month.
  const rows = employees
    .filter((e) => e.active || paidBy.has(e.id))
    .map((e) => ({
      ...e,
      calc: computeSalary(e.monthlySalary, month, records.filter((r) => r.employeeId === e.id)),
      payment: paidBy.get(e.id) ?? null,
    }));

  const totalGross = rows.reduce((s, r) => s + r.calc.gross, 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.netPay), 0);
  const pending = rows.filter((r) => !r.payment).reduce((s, r) => s + r.calc.gross, 0);

  return (
    <>
      <PageHeader eyebrow="Staff & HR" title="Salary" description={`Salary sheet for ${monthName}, calculated from attendance (absent = no pay, half day = half pay).`}>
        <MonthPicker month={month} />
      </PageHeader>

      <div className="hidden print:mb-4 print:block">
        <p className="text-xl font-bold">{settings.hotelName}</p>
        <p className="text-sm">Salary sheet · {monthName}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Employees" value={rows.length} icon={Users} tone="brand" />
        <StatCard label="Salary due (calculated)" value={money(totalGross)} icon={Banknote} tone="sky" />
        <StatCard label="Paid" value={money(totalPaid)} hint={`${payments.length} of ${rows.length} employees`} icon={Wallet} tone="emerald" />
        <StatCard label="Still to pay" value={money(pending)} icon={CircleDollarSign} tone="rose" />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No employees" description="Add employees and their monthly salary first.">
            <Button asChild>
              <Link href="/hr/employees">Add employees</Link>
            </Button>
          </EmptyState>
        ) : (
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Employee</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Absent</TableHead>
                  <TableHead className="text-right">Half day</TableHead>
                  <TableHead className="text-right">Payable days</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead className="text-right">Net paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 print:hidden" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-5">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{[r.designation, r.department].filter(Boolean).join(" · ")}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.monthlySalary)}</TableCell>
                    <TableCell className="text-right tabular-nums text-rose-600">{r.calc.absent}</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600">{r.calc.halfDays}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.calc.payableDays} / {r.calc.days}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.calc.gross)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {r.payment ? money(r.payment.netPay) : "—"}
                      {r.payment && (Number(r.payment.deductions) > 0 || Number(r.payment.bonus) > 0) && (
                        <p className="text-xs font-normal text-muted-foreground">
                          {Number(r.payment.bonus) > 0 && `+${money(r.payment.bonus)} `}
                          {Number(r.payment.deductions) > 0 && `−${money(r.payment.deductions)}`}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.payment ? (
                        <div>
                          <StatusBadge value="PAID" label="Paid" />
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(r.payment.paidOn)} · {humanize(r.payment.method)}
                          </p>
                        </div>
                      ) : (
                        <StatusBadge value="UNPAID" label="Not paid" />
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-right print:hidden">
                      {r.payment ? (
                        <UndoSalaryButton paymentId={r.payment.id} name={r.name} />
                      ) : (
                        <PaySalaryDialog
                          employee={{ id: r.id, name: r.name }}
                          month={month}
                          gross={r.calc.gross}
                          payableDays={r.calc.payableDays}
                          days={r.calc.days}
                          currency={settings.currency}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-5" colSpan={5}>
                    Total
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(totalGross)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(totalPaid)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
