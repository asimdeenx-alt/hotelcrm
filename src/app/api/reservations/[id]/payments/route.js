import { ApiError, ok, parseId, readJson, route } from "@/lib/api";
import { paymentSchema } from "@/lib/validators";

export const POST = route("billing", async (request, { params, session, db: prisma }) => {
  const reservationId = parseId(params.id);
  const data = await readJson(request, paymentSchema);
  const r = await prisma.reservation.findUnique({ where: { id: reservationId }, select: { status: true } });
  if (!r) throw new ApiError(404, "Reservation not found.");
  if (["CANCELLED", "NO_SHOW"].includes(r.status)) throw new ApiError(409, "Cannot take payment on a cancelled reservation.");
  const payment = await prisma.payment.create({ data: { ...data, reservationId, receivedById: session.id } });
  return ok(payment, { status: 201 });
});
