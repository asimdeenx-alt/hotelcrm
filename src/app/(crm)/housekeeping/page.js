import { InspectionPanel } from "@/components/housekeeping/inspection-panel";
import { TaskBoard } from "@/components/housekeeping/task-board";
import { PageHeader } from "@/components/shared/page-header";
import { serialize } from "@/lib/api";
import { requirePageSession } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Housekeeping" };

export default async function HousekeepingPage() {
  const session = await requirePageSession("housekeeping");
  const prisma = forHotel(session.hotelId);
  const recentCutoff = addDays(new Date(), -3);

  const [tasks, rooms, staff, awaiting, inspections] = await Promise.all([
    prisma.housekeepingTask.findMany({
      where: { OR: [{ status: { not: "DONE" } }, { completedAt: { gte: recentCutoff } }] },
      include: { room: true, assignedTo: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.room.findMany({ select: { id: true, number: true, status: true }, orderBy: { number: "asc" } }),
    prisma.user.findMany({
      where: { active: true, role: { in: ["HOUSEKEEPING", "MANAGER", "ADMIN"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.room.findMany({
      where: { status: "INSPECTION" },
      include: { roomType: { select: { name: true } } },
      orderBy: { number: "asc" },
    }),
    prisma.roomInspection.findMany({
      where: { createdAt: { gte: addDays(new Date(), -7) } },
      include: { room: { select: { number: true } }, inspectedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Housekeeping"
        description="Clean → inspect → ready. When the last cleaning task on a room is done it waits for inspection; a passed inspection makes it available for guests."
      />
      <InspectionPanel
        rooms={serialize(awaiting)}
        recent={serialize(inspections)}
        canInspect={can(session.role, "housekeeping.inspect")}
      />
      <TaskBoard tasks={serialize(tasks)} rooms={rooms} staff={staff} />
    </>
  );
}
