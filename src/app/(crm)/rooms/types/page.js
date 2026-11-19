import Link from "next/link";
import { RoomTypeManager } from "@/components/rooms/room-type-manager";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { serialize } from "@/lib/api";
import { requirePageSession } from "@/lib/auth";
import { forHotel } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Room types" };

export default async function RoomTypesPage() {
  const session = await requirePageSession("rooms.manage");
  const prisma = forHotel(session.hotelId);
  const settings = await getSettings(session.hotelId);
  const types = await prisma.roomType.findMany({
    orderBy: { baseRate: "asc" },
    include: { _count: { select: { rooms: true } } },
  });

  return (
    <>
      <PageHeader eyebrow="Rooms" title="Room types" description="Categories, base rates, capacity and amenities.">
        <Button variant="outline" asChild>
          <Link href="/rooms">Back to rooms</Link>
        </Button>
      </PageHeader>
      <RoomTypeManager types={serialize(types)} currency={settings.currency} />
    </>
  );
}
