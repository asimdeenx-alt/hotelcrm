import { ApiError, ok, parseId, readJson, route } from "@/lib/api";
import { todayDateOnly } from "@/lib/dates";
import { inspectionSchema } from "@/lib/validators";

/**
 * Supervisor inspection of a cleaned room.
 * PASSED → room becomes AVAILABLE. FAILED → back to CLEANING with a re-clean task.
 */
export const POST = route("housekeeping.inspect", async (request, { params, session, db }) => {
  const roomId = parseId(params.id);
  const { result, notes } = await readJson(request, inspectionSchema);

  const outcome = await db.$transaction(async (tx) => {
    const room = await tx.room.findUnique({ where: { id: roomId } });
    if (!room) throw new ApiError(404, "Room not found.");
    if (!["INSPECTION", "CLEANING"].includes(room.status)) {
      throw new ApiError(409, `Room ${room.number} is not waiting for inspection.`);
    }

    const inspection = await tx.roomInspection.create({
      data: { roomId, result, notes: notes ?? null, inspectedById: session.id },
    });

    if (result === "PASSED") {
      await tx.room.update({ where: { id: roomId }, data: { status: "AVAILABLE" } });
    } else {
      await tx.room.update({ where: { id: roomId }, data: { status: "CLEANING" } });
      await tx.housekeepingTask.create({
        data: {
          roomId,
          title: `Re-clean room ${room.number} (failed inspection)`,
          priority: "URGENT",
          notes: notes ?? null,
          dueDate: todayDateOnly(),
        },
      });
    }
    return inspection;
  });

  return ok(outcome, { status: 201 });
});
