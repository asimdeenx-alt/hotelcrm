import { ApiError, ok, parseId, readJson, route } from "@/lib/api";
import { chargeSchema } from "@/lib/validators";

export const POST = route("billing", async (request, { params, db: prisma }) => {
  const reservationId = parseId(params.id);
  const data = await readJson(request, chargeSchema);
  const r = await prisma.reservation.findUnique({ where: { id: reservationId }, select: { status: true } });
  if (!r) throw new ApiError(404, "Reservation not found.");
  if (["CHECKED_OUT", "CANCELLED", "NO_SHOW"].includes(r.status)) throw new ApiError(409, "This folio is closed.");
  return ok(await prisma.charge.create({ data: { ...data, reservationId } }), { status: 201 });
});
