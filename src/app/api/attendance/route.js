import { ApiError, ok, readJson, route } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { attendanceSchema } from "@/lib/validators";

/** Saves one day's attendance for many employees. A null status clears that day's mark. */
export const PUT = route("attendance", async (request, { db }) => {
  const { date, records } = await readJson(request, attendanceSchema);
  const day = parseDateOnly(date);

  const ids = [...new Set(records.map((r) => r.employeeId))];
  const found = await db.employee.count({ where: { id: { in: ids } } });
  if (found !== ids.length) throw new ApiError(404, "One or more employees were not found.");

  await db.$transaction(async (tx) => {
    for (const r of records) {
      if (!r.status) {
        await tx.attendance.deleteMany({ where: { employeeId: r.employeeId, date: day } });
        continue;
      }
      await tx.attendance.upsert({
        where: { employeeId_date: { employeeId: r.employeeId, date: day } },
        update: { status: r.status, notes: r.notes ?? null },
        create: { employeeId: r.employeeId, date: day, status: r.status, notes: r.notes ?? null },
      });
    }
  });
  return ok({ saved: records.length });
});
