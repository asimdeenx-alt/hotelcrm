import { ok, parseId, route } from "@/lib/api";
import { cancelReservation, withFolio } from "@/services/reservations";

export const POST = route("reservations.manage", async (request, { params, db: prisma }) => {
  const body = await request.json().catch(() => ({}));
  const status = body?.status === "NO_SHOW" ? "NO_SHOW" : "CANCELLED";
  return ok(await withFolio(await cancelReservation(prisma, parseId(params.id), status)));
});
