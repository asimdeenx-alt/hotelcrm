import { ok, readJson, route } from "@/lib/api";
import { TASK_STATUSES } from "@/lib/constants";
import { parseDateOnly } from "@/lib/dates";
import { taskSchema } from "@/lib/validators";

const include = { room: true, assignedTo: { select: { id: true, name: true } } };

export const GET = route("housekeeping", async (request, { db: prisma }) => {
  const status = new URL(request.url).searchParams.get("status");
  const tasks = await prisma.housekeepingTask.findMany({
    where: TASK_STATUSES.includes(status) ? { status } : undefined,
    include,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return ok(tasks);
});

export const POST = route("housekeeping", async (request, { db: prisma }) => {
  const data = await readJson(request, taskSchema);
  const task = await prisma.housekeepingTask.create({
    data: {
      ...data,
      dueDate: data.dueDate ? parseDateOnly(data.dueDate) : null,
      completedAt: data.status === "DONE" ? new Date() : null,
    },
    include,
  });
  return ok(task, { status: 201 });
});
