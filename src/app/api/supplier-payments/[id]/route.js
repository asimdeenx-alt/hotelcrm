import { ok, parseId, route } from "@/lib/api";

export const DELETE = route("purchases", async (_req, { params, db }) => {
  await db.supplierPayment.delete({ where: { id: parseId(params.id) } });
  return ok({ success: true });
});
