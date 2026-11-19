import { ApiError, ok, parseId, readPartial, route } from "@/lib/api";
import { can } from "@/lib/permissions";
import { roomSchema, roomStatusSchema } from "@/lib/validators";

// Housekeeping and front desk may only change status; managers may edit everything.
export const PATCH = route("rooms.status", async (request, { params, session, db: prisma }) => {
  const id = parseId(params.id);
  const data = await readPartial(request, can(session.role, "rooms.manage") ? roomSchema : roomStatusSchema);
  if (!can(session.role, "rooms.manage") && !data.status) throw new ApiError(422, "status: is required");

  if (data.status) {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw new ApiError(404, "Room not found.");
    const inHouse = await prisma.reservation.count({ where: { roomId: id, status: "CHECKED_IN" } });
    if (inHouse && data.status !== "OCCUPIED") throw new ApiError(409, "A guest is checked in to this room.");
    if (!inHouse && data.status === "OCCUPIED") throw new ApiError(409, "Rooms become occupied through check-in.");
  }
  return ok(await prisma.room.update({ where: { id }, data, include: { roomType: true } }));
});

export const DELETE = route("rooms.manage", async (_req, { params, db: prisma }) => {
  const id = parseId(params.id);
  const bookings = await prisma.reservation.count({ where: { roomId: id } });
  if (bookings > 0) {
    throw new ApiError(409, "This room has reservation history and cannot be deleted. Mark it out of order instead.");
  }
  await prisma.room.delete({ where: { id } });
  return ok({ success: true });
});
