import { ApiError, ok, parseId, readPartial, route } from "@/lib/api";
import { hotelUpdateSchema } from "@/lib/validators";

/**
 * Platform owner controls for one hotel.
 * Body: { status?, plan?, subscriptionEndsAt? ("YYYY-MM-DD" | null), extendDays?, notes? }
 * `extendDays` adds days from the later of today or the current end date.
 */
export const PATCH = route("platform", async (request, { params, db }) => {
  const id = parseId(params.id);
  // readPartial keeps only keys actually sent, so omitted fields are never cleared.
  const input = await readPartial(request, hotelUpdateSchema);
  const hotel = await db.hotel.findUnique({ where: { id } });
  if (!hotel) throw new ApiError(404, "Hotel not found.");

  const data = {};
  if (input.status) data.status = input.status;
  if (input.plan !== undefined) data.plan = input.plan;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.subscriptionEndsAt !== undefined) {
    data.subscriptionEndsAt = input.subscriptionEndsAt ? new Date(`${input.subscriptionEndsAt}T23:59:59`) : null;
  }
  if (input.extendDays) {
    const current = hotel.subscriptionEndsAt && hotel.subscriptionEndsAt > new Date() ? hotel.subscriptionEndsAt : new Date();
    data.subscriptionEndsAt = new Date(current.getTime() + input.extendDays * 86400000);
  }

  const updated = await db.hotel.update({
    where: { id },
    data,
    include: {
      users: { where: { role: "ADMIN" }, select: { name: true, email: true }, orderBy: { createdAt: "asc" }, take: 1 },
      _count: { select: { users: true, rooms: true, reservations: true, guests: true } },
    },
  });
  return ok(updated);
});
