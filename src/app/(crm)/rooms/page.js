import Link from "next/link";
import { RoomBoard } from "@/components/rooms/room-board";
import { RoomFormDialog } from "@/components/rooms/room-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { serialize } from "@/lib/api";
import { requirePageSession } from "@/lib/auth";
import { todayDateOnly } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Rooms" };

export default async function RoomsPage() {
  const session = await requirePageSession("rooms");
  const prisma = forHotel(session.hotelId);
  const today = todayDateOnly();
  const [rooms, roomTypes] = await Promise.all([
    prisma.room.findMany({
      include: {
        roomType: true,
        reservations: {
          where: {
            OR: [
              { status: "CHECKED_IN" },
              { status: { in: ["PENDING", "CONFIRMED"] }, checkIn: { lte: today }, checkOut: { gt: today } },
            ],
          },
          include: { guest: { select: { firstName: true, lastName: true, vip: true } } },
          take: 1,
        },
      },
      orderBy: [{ floor: "asc" }, { number: "asc" }],
    }),
    prisma.roomType.findMany({ orderBy: { baseRate: "asc" } }),
  ]);
  const canManage = can(session.role, "rooms.manage");

  return (
    <>
      <PageHeader eyebrow="Front office" title="Rooms" description="Live status for every room, floor by floor.">
        {canManage && (
          <>
            <Button variant="outline" asChild>
              <Link href="/rooms/types">Room types</Link>
            </Button>
            {roomTypes.length > 0 && <RoomFormDialog roomTypes={serialize(roomTypes)} />}
          </>
        )}
      </PageHeader>
      {rooms.length === 0 ? (
        <EmptyState
          title="No rooms yet"
          description={roomTypes.length ? "Add your first room to start taking reservations." : "Create a room type first, then add rooms."}
        >
          {canManage && !roomTypes.length && (
            <Button asChild>
              <Link href="/rooms/types">Create a room type</Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <RoomBoard rooms={serialize(rooms)} roomTypes={serialize(roomTypes)} canManage={canManage} canInspect={can(session.role, "housekeeping.inspect")} />
      )}
    </>
  );
}
