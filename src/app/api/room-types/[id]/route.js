import { ApiError, ok, parseId, readPartial, route } from "@/lib/api";
import { roomTypeSchema } from "@/lib/validators";

export const PATCH = route("rooms.manage", async (request, { params, db: prisma }) => {
  const data = await readPartial(request, roomTypeSchema);
  return ok(await prisma.roomType.update({ where: { id: parseId(params.id) }, data }));
});

export const DELETE = route("rooms.manage", async (_req, { params, db: prisma }) => {
  const id = parseId(params.id);
  const rooms = await prisma.room.count({ where: { roomTypeId: id } });
  if (rooms > 0) throw new ApiError(409, `This room type is used by ${rooms} room(s). Reassign them first.`);
  await prisma.roomType.delete({ where: { id } });
  return ok({ success: true });
});
