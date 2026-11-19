import { ok, parseId, route } from "@/lib/api";

// Undo a salary payment (e.g. entered by mistake) so it can be recalculated.
export const DELETE = route("salary", async (_req, { params, db }) => {
  await db.salaryPayment.delete({ where: { id: parseId(params.id) } });
  return ok({ success: true });
});
