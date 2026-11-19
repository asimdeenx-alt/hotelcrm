import { ApiError, ok, readJson, route } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { round2 } from "@/lib/format";
import { computeSalary, monthRange } from "@/lib/salary";
import { salaryPaySchema } from "@/lib/validators";

/** Pays one employee's salary for a month, calculated from attendance on the server. */
export const POST = route("salary", async (request, { db }) => {
  const input = await readJson(request, salaryPaySchema);
  const employee = await db.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee) throw new ApiError(404, "Employee not found.");

  const { start, end } = monthRange(input.month);
  const records = await db.attendance.findMany({
    where: { employeeId: employee.id, date: { gte: start, lt: end } },
    select: { status: true },
  });
  const s = computeSalary(employee.monthlySalary, input.month, records);
  const netPay = round2(s.gross - input.deductions + input.bonus);
  if (netPay < 0) throw new ApiError(422, "Deductions cannot be more than the salary.");

  const payment = await db.salaryPayment.create({
    data: {
      employeeId: employee.id,
      month: input.month,
      baseSalary: employee.monthlySalary,
      payableDays: s.payableDays,
      daysInMonth: s.days,
      deductions: input.deductions,
      bonus: input.bonus,
      netPay,
      method: input.method,
      paidOn: parseDateOnly(input.paidOn),
      notes: input.notes ?? null,
    },
  });
  return ok(payment, { status: 201 });
});
