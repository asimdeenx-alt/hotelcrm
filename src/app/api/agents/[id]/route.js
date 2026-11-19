import { ok, parseId, readPartial, route } from "@/lib/api";
import { agentSchema } from "@/lib/validators";

export const PATCH = route("agents", async (request, { params, db }) => {
  const data = await readPartial(request, agentSchema);
  return ok(await db.travelAgent.update({ where: { id: parseId(params.id) }, data }));
});
