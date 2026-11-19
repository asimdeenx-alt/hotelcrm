import { ApiError, ok, parseId, readJson, route } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { agentTxnSchema } from "@/lib/validators";

/** Manual ledger entry: invoice, payment received, commission or adjustment. */
export const POST = route("agents", async (request, { params, db }) => {
  const agentId = parseId(params.id);
  const input = await readJson(request, agentTxnSchema);
  const agent = await db.travelAgent.findUnique({ where: { id: agentId }, select: { id: true } });
  if (!agent) throw new ApiError(404, "Agent not found.");
  if (input.type !== "ADJUSTMENT" && input.amount < 0) throw new ApiError(422, "amount: must be greater than zero");

  const txn = await db.agentTransaction.create({
    data: { ...input, agentId, date: parseDateOnly(input.date) },
  });
  return ok(txn, { status: 201 });
});
