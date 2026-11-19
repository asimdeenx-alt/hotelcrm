import { ApiError, ok, parseId, route } from "@/lib/api";

export const DELETE = route("purchases", async (_req, { params, db }) => {
  const id = parseId(params.id);
  const bill = await db.purchaseBill.findUnique({ where: { id }, include: { _count: { select: { payments: true } } } });
  if (!bill) throw new ApiError(404, "Bill not found.");
  if (bill._count.payments > 0) throw new ApiError(409, "This bill has payments. Delete its payments first.");
  await db.purchaseBill.delete({ where: { id } });
  return ok({ success: true });
});
