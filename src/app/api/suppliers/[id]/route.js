import { ok, parseId, readPartial, route } from "@/lib/api";
import { supplierSchema } from "@/lib/validators";

export const PATCH = route("purchases", async (request, { params, db }) => {
  const data = await readPartial(request, supplierSchema);
  return ok(await db.supplier.update({ where: { id: parseId(params.id) }, data }));
});
