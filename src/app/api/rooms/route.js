import { ok, readJson, route } from "@/lib/api";
import { ROOM_STATUSES } from "@/lib/constants";
import { roomSchema } from "@/lib/validators";

export const GET = route("rooms", async (request, { db: prisma }) => {
  const status = new URL(request.url).searchParams.get("status");
  const rooms = await prisma.room.findMany({
    where: ROOM_STATUSES.includes(status) ? { status } : undefined,
    include: { roomType: true },
    orderBy: [{ floor: "asc" }, { number: "asc" }],
  });
  return ok(rooms);
});

export const POST = route("rooms.manage", async (request, { db: prisma }) => {
  const data = await readJson(request, roomSchema);
  if (data.status === "OCCUPIED") data.status = "AVAILABLE";
  return ok(await prisma.room.create({ data, include: { roomType: true } }), { status: 201 });
});
