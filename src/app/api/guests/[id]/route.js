import { ApiError, ok, parseId, readPartial, route } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { guestSchema } from "@/lib/validators";

export const GET = route("guests", async (_req, { params, db: prisma }) => {
  const guest = await prisma.guest.findUnique({
    where: { id: parseId(params.id) },
    include: { reservations: { include: { room: true }, orderBy: { checkIn: "desc" } } },
  });
  if (!guest) throw new ApiError(404, "Guest not found.");
  return ok(guest);
});

export const PATCH = route("guests.manage", async (request, { params, db: prisma }) => {
  const data = await readPartial(request, guestSchema);
  if ("dateOfBirth" in data) data.dateOfBirth = data.dateOfBirth ? parseDateOnly(data.dateOfBirth) : null;
  return ok(await prisma.guest.update({ where: { id: parseId(params.id) }, data }));
});

export const DELETE = route("guests.manage", async (_req, { params, db: prisma }) => {
  const id = parseId(params.id);
  const stays = await prisma.reservation.count({ where: { guestId: id } });
  if (stays > 0) throw new ApiError(409, "Guests with reservation history cannot be deleted.");
  await prisma.guest.delete({ where: { id } });
  return ok({ success: true });
});
