import { ApiError, ok, parseId, route } from "@/lib/api";

export const DELETE = route("billing", async (_req, { params, db: prisma }) => {
  const reservationId = parseId(params.id);
  const charge = await prisma.charge.findUnique({
    where: { id: parseId(params.chargeId) },
    include: { reservation: { select: { status: true } } },
  });
  if (!charge || charge.reservationId !== reservationId) throw new ApiError(404, "Charge not found.");
  if (charge.reservation.status === "CHECKED_OUT") throw new ApiError(409, "This folio is closed.");
  await prisma.charge.delete({ where: { id: charge.id } });
  return ok({ success: true });
});
