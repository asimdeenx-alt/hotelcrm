import Link from "next/link";
import { AttendanceSheet } from "@/components/hr/attendance-sheet";
import { DayPicker } from "@/components/reports/date-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageSession } from "@/lib/auth";
import { formatDate, parseDateOnly, safeDateParam } from "@/lib/dates";
import { computeSalary, monthRange } from "@/lib/salary";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Attendance" };

export default async function AttendancePage({ searchParams }) {
  const session = await requirePageSession("attendance");
  const prisma = forHotel(session.hotelId);
  const { date: dateParam } = await searchParams;
  const date = safeDateParam(dateParam);
  const day = parseDateOnly(date);
  const month = date.slice(0, 7);
  const { start, end } = monthRange(month);

  const employees = await prisma.employee.findMany({
    where: { active: true },
    select: { id: true, name: true, designation: true, department: true, monthlySalary: true },
    orderBy: [{ department: "asc" }, { name: "asc" }],
  });
  const monthRecords = await prisma.attendance.findMany({
    where: { date: { gte: start, lt: end } },
    select: { employeeId: true, date: true, status: true },
  });
  const marks = Object.fromEntries(
    monthRecords.filter((r) => r.date.getTime() === day.getTime()).map((r) => [r.employeeId, r.status])
  );
  const monthName = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(start);

  return (
    <>
      <PageHeader eyebrow="Staff & HR" title="Attendance" description={`Daily attendance · ${formatDate(day)}. Unmarked days count as worked when salary is calculated.`}>
        <DayPicker date={date} />
      </PageHeader>

      {employees.length === 0 ? (
        <EmptyState title="No employees yet" description="Add employees first, then mark their attendance here.">
          <Button asChild>
            <Link href="/hr/employees">Add employees</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-6">
          {/* key resets the sheet when the date changes */}
          <AttendanceSheet key={date} date={date} employees={employees.map(({ monthlySalary, ...e }) => e)} marks={marks} />

          <Card className="gap-0 pb-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">{monthName} summary</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Employee</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                  <TableHead className="text-right">Absent</TableHead>
                  <TableHead className="text-right">Half day</TableHead>
                  <TableHead className="text-right">Leave</TableHead>
                  <TableHead className="text-right">Holiday</TableHead>
                  <TableHead className="pr-6 text-right">Payable days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e) => {
                  const s = computeSalary(e.monthlySalary, month, monthRecords.filter((r) => r.employeeId === e.id));
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="pl-6 font-medium">{e.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">{s.present}</TableCell>
                      <TableCell className="text-right tabular-nums text-rose-600">{s.absent}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">{s.halfDays}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.leave}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.holidays}</TableCell>
                      <TableCell className="pr-6 text-right font-semibold tabular-nums">
                        {s.payableDays} / {s.days}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}
