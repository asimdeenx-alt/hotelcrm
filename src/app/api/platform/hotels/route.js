import { ok, route } from "@/lib/api";

// Platform owner only: every hotel with its owner and usage counts.
export const GET = route("platform", async (_req, { db }) => {
  const hotels = await db.hotel.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { where: { role: "ADMIN" }, select: { name: true, email: true }, orderBy: { createdAt: "asc" }, take: 1 },
      _count: { select: { users: true, rooms: true, reservations: true, guests: true } },
    },
  });
  return ok(hotels);
});
