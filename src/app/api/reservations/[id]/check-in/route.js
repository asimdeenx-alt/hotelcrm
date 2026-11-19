import { ok, parseId, route } from "@/lib/api";
import { checkIn, withFolio } from "@/services/reservations";

export const POST = route("reservations.manage", async (_req, { params, db: prisma }) => {
  return ok(await withFolio(await checkIn(prisma, parseId(params.id))));
});
