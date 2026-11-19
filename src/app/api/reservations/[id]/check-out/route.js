import { ApiError, ok, parseId, route } from "@/lib/api";
import { checkOut, withFolio } from "@/services/reservations";

export const POST = route("reservations.manage", async (request, { params, session, db: prisma }) => {
  const body = await request.json().catch(() => ({}));
  const force = Boolean(body?.force);
  if (force && !["ADMIN", "MANAGER"].includes(session.role)) {
    throw new ApiError(403, "Only managers can check out a guest with an open balance.");
  }
  return ok(await withFolio(await checkOut(prisma, session.hotelId, parseId(params.id), { force })));
});
