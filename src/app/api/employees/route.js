import { ok, readJson, route } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { employeeSchema } from "@/lib/validators";

export const POST = route("hr", async (request, { db }) => {
  const data = await readJson(request, employeeSchema);
  const employee = await db.employee.create({
    data: { ...data, joinDate: data.joinDate ? parseDateOnly(data.joinDate) : null },
  });
  return ok(employee, { status: 201 });
});
