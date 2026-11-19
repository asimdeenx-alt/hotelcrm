import { ok, readJson, route } from "@/lib/api";
import { agentSchema } from "@/lib/validators";

// Active agents for the booking form (front desk can read the list).
export const GET = route("agents.list", async (_req, { db }) => {
  const agents = await db.travelAgent.findMany({
    where: { active: true },
    select: { id: true, name: true, commissionPct: true },
    orderBy: { name: "asc" },
  });
  return ok(agents);
});

export const POST = route("agents", async (request, { db }) => {
  const data = await readJson(request, agentSchema);
  return ok(await db.travelAgent.create({ data }), { status: 201 });
});
