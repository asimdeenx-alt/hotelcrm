import { ApiError, ok, parseId, route } from "@/lib/api";

export const DELETE = route("agents", async (_req, { params, db }) => {
  const agentId = parseId(params.id);
  const txn = await db.agentTransaction.findUnique({ where: { id: parseId(params.txnId) } });
  if (!txn || txn.agentId !== agentId) throw new ApiError(404, "Entry not found.");
  await db.agentTransaction.delete({ where: { id: txn.id } });
  return ok({ success: true });
});
