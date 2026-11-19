import { ApiError, ok, route } from "@/lib/api";
import { findAvailableRooms } from "@/services/reservations";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = route("reservations", async (request, { db: prisma }) => {
  const { searchParams } = new URL(request.url);
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guests = Number(searchParams.get("guests")) || 1;
  if (!DATE.test(checkIn) || !DATE.test(checkOut)) throw new ApiError(400, "checkIn and checkOut are required (YYYY-MM-DD).");
  if (checkOut <= checkIn) throw new ApiError(422, "Check-out must be after check-in.");
  return ok(await findAvailableRooms(prisma, { checkIn, checkOut, guests }));
});
