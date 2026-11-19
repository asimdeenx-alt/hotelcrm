import { Banknote, IdCard, UserCheck } from "lucide-react";
import { EmployeeFormDialog } from "@/components/hr/employee-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilters } from "@/components/shared/search-filters";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { serialize } from "@/lib/api";
import { requirePageSession } from "@/lib/auth";
import { DEPARTMENTS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Employees" };

export default async function EmployeesPage({ searchParams }) {
  const session = await requirePageSession("hr");
  const prisma = forHotel(session.hotelId);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const dept = DEPARTMENTS.includes(sp.dept) ? sp.dept : "";
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);

  const [employees, all] = await Promise.all([
    prisma.employee.findMany({
      where: {
        ...(dept ? { department: dept } : {}),
        ...(q ? { OR: [{ name: { contains: q } }, { designation: { contains: q } }, { phone: { contains: q } }] } : {}),
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.employee.findMany({ where: { active: true }, select: { monthlySalary: true } }),
  ]);
  const payroll = all.reduce((s, e) => s + Number(e.monthlySalary), 0);

  return (
    <>
      <PageHeader eyebrow="Staff & HR" title="Employees" description="Records for everyone who works at the hotel — whether or not they have a CRM login.">
        <EmployeeFormDialog />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Working staff" value={all.length} icon={UserCheck} tone="emerald" />
        <StatCard label="Monthly payroll" value={money(payroll)} icon={Banknote} tone="brand" />
        <StatCard label="All records" value={employees.length} icon={IdCard} tone="sky" />
      </div>

      <div className="mt-6">
        <SearchFilters placeholder="Search name, designation or phone…" statuses={DEPARTMENTS} statusParam="dept" />
      </div>

      {employees.length === 0 ? (
        <EmptyState title="No employees yet" description="Add your staff to track attendance and pay salaries." />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Monthly salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id} className={e.active ? "" : "opacity-60"}>
                  <TableCell className="pl-5">
                    <p className="font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.designation || "—"}</p>
                  </TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell className="text-muted-foreground">{e.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.joinDate ? formatDate(e.joinDate) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(e.monthlySalary)}</TableCell>
                  <TableCell>
                    <StatusBadge value={e.active ? "ACTIVE" : "LEFT"} label={e.active ? "Working" : "Left"} tone={e.active ? "success" : "muted"} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <EmployeeFormDialog employee={serialize(e)} />
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
