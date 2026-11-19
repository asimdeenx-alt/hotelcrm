import { ok, readJson, route } from "@/lib/api";
import { roomTypeSchema } from "@/lib/validators";

export const GET = route("rooms", async (_req, { db: prisma }) => {
  const types = await prisma.roomType.findMany({
    orderBy: { baseRate: "asc" },
    include: { _count: { select: { rooms: true } } },
  });
  return ok(types);
});

export const POST = route("rooms.manage", async (request, { db: prisma }) => {
  const data = await readJson(request, roomTypeSchema);
  return ok(await prisma.roomType.create({ data }), { status: 201 });
});
