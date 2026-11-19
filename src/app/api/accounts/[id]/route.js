import { ok, parseId, route } from "@/lib/api";

export const DELETE = route("accounts", async (_req, { params, db }) => {
  await db.accountEntry.delete({ where: { id: parseId(params.id) } });
  return ok({ success: true });
});
