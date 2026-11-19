import { ApiError, ok, parseId, readPartial, route } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { taskSchema } from "@/lib/validators";

export const PATCH = route("housekeeping", async (request, { params, db: prisma }) => {
  const id = parseId(params.id);
  const data = await readPartial(request, taskSchema);
  const task = await prisma.housekeepingTask.findUnique({ where: { id } });
  if (!task) throw new ApiError(404, "Task not found.");

  if ("dueDate" in data) data.dueDate = data.dueDate ? parseDateOnly(data.dueDate) : null;
  if (data.status) data.completedAt = data.status === "DONE" ? new Date() : null;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.housekeepingTask.update({
      where: { id },
      data,
      include: { room: true, assignedTo: { select: { id: true, name: true } } },
    });
    // When the last open task for a room in cleaning is done, the room waits for inspection.
    if (data.status === "DONE" && result.room.status === "CLEANING") {
      const open = await tx.housekeepingTask.count({ where: { roomId: result.roomId, status: { not: "DONE" } } });
      if (open === 0) {
        result.room = await tx.room.update({ where: { id: result.roomId }, data: { status: "INSPECTION" } });
      }
    }
    return result;
  });
  return ok(updated);
});

export const DELETE = route("housekeeping", async (_req, { params, db: prisma }) => {
  await prisma.housekeepingTask.delete({ where: { id: parseId(params.id) } });
  return ok({ success: true });
});
