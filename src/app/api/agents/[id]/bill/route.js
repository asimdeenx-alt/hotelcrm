import { ApiError, ok, parseId, readJson, route } from "@/lib/api";
import { todayDateOnly } from "@/lib/dates";
import { computeFolio } from "@/lib/folio";
import { round2 } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { z } from "zod";

const schema = z.object({ reservationId: z.coerce.number().int().positive() });

/**
 * Bills a stay booked through this agent to the agent's account:
 * an INVOICE for the unpaid folio amount, plus COMMISSION on the room charge.
 */
export const POST = route("agents", async (request, { params, db, session }) => {
  const agentId = parseId(params.id);
  const { reservationId } = await readJson(request, schema);
  const settings = await getSettings(session.hotelId);

  const created = await db.$transaction(async (tx) => {
    const agent = await tx.travelAgent.findUnique({ where: { id: agentId } });
    if (!agent) throw new ApiError(404, "Agent not found.");
    const r = await tx.reservation.findUnique({ where: { id: reservationId }, include: { charges: true, payments: true } });
    if (!r || r.agentId !== agentId) throw new ApiError(404, "This booking was not made through this agent.");
    if (!["CHECKED_IN", "CHECKED_OUT"].includes(r.status)) throw new ApiError(409, "Only started or completed stays can be billed.");
    const already = await tx.agentTransaction.findFirst({ where: { reservationId, type: "INVOICE" } });
    if (already) throw new ApiError(409, `Booking ${r.code} is already billed to this agent.`);

    const folio = computeFolio(r, settings.taxRate);
    const due = Math.max(0, folio.balance);
    if (due <= 0) throw new ApiError(409, "The guest has already paid this bill in full.");

    const rows = [
      { agentId, type: "INVOICE", amount: due, date: todayDateOnly(), reference: r.code, reservationId, notes: "Stay billed to agent" },
    ];
    const commission = round2((folio.roomTotal * Number(agent.commissionPct)) / 100);
    if (commission > 0) {
      rows.push({
        agentId,
        type: "COMMISSION",
        amount: commission,
        date: todayDateOnly(),
        reference: r.code,
        reservationId,
        notes: `${agent.commissionPct}% commission on room charges`,
      });
    }
    for (const data of rows) await tx.agentTransaction.create({ data });
    return rows;
  });

  return ok(created, { status: 201 });
});
