import { ok, parseId, readPartial, route } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { employeeSchema } from "@/lib/validators";

export const PATCH = route("hr", async (request, { params, db }) => {
  const data = await readPartial(request, employeeSchema);
  if ("joinDate" in data) data.joinDate = data.joinDate ? parseDateOnly(data.joinDate) : null;
  return ok(await db.employee.update({ where: { id: parseId(params.id) }, data }));
});
