import { ApiError, ok, parseId, readPartial, route } from "@/lib/api";
import { reservationUpdateSchema } from "@/lib/validators";
import { reservationInclude, updateReservation, withFolio } from "@/services/reservations";

export const GET = route("reservations", async (_req, { params, db: prisma }) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: parseId(params.id) },
    include: reservationInclude,
  });
  if (!reservation) throw new ApiError(404, "Reservation not found.");
  return ok(await withFolio(reservation));
});

export const PATCH = route("reservations.manage", async (request, { params, db: prisma }) => {
  const input = await readPartial(request, reservationUpdateSchema);
  if (input.checkIn && input.checkOut && input.checkOut <= input.checkIn) {
    throw new ApiError(422, "Check-out must be after check-in.");
  }
  return ok(await withFolio(await updateReservation(prisma, parseId(params.id), input)));
});
