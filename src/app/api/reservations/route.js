import { ok, readJson, route } from "@/lib/api";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { reservationCreateSchema } from "@/lib/validators";
import { createReservation, withFolio } from "@/services/reservations";

export const GET = route("reservations", async (request, { db: prisma }) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();
  const reservations = await prisma.reservation.findMany({
    where: {
      ...(RESERVATION_STATUSES.includes(status) ? { status } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q } },
              { guest: { firstName: { contains: q } } },
              { guest: { lastName: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { guest: true, room: { include: { roomType: true } } },
    orderBy: { checkIn: "desc" },
    take: 200,
  });
  return ok(reservations);
});

export const POST = route("reservations.manage", async (request, { session, db: prisma }) => {
  const input = await readJson(request, reservationCreateSchema);
  const reservation = await createReservation(prisma, input, session);
  return ok(await withFolio(reservation), { status: 201 });
});
