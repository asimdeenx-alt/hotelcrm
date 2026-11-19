import { Building2, CircleCheck, Clock, PauseCircle } from "lucide-react";
import { HotelsTable } from "@/components/platform/hotels-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { serialize } from "@/lib/api";
import { requirePageSession } from "@/lib/auth";
import { hotelAccess } from "@/lib/hotel-access";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Hotels" };

export default async function PlatformPage() {
  // Platform owner only — this page deliberately uses the unscoped client.
  await requirePageSession("platform");

  const hotels = await prisma.hotel.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { where: { role: "ADMIN" }, select: { name: true, email: true }, orderBy: { createdAt: "asc" }, take: 1 },
      _count: { select: { users: true, rooms: true, reservations: true, guests: true } },
    },
  });

  const live = hotels.filter((h) => hotelAccess(h).allowed);
  const count = (status) => live.filter((h) => h.status === status).length;
  const blocked = hotels.length - live.length;

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Hotels"
        description="Every hotel using the CRM. Activate subscriptions, extend trials or suspend access."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total hotels" value={hotels.length} icon={Building2} />
        <StatCard label="Paying (active)" value={count("ACTIVE")} icon={CircleCheck} tone="emerald" />
        <StatCard label="On free trial" value={count("TRIAL")} icon={Clock} tone="amber" />
        <StatCard label="Suspended or expired" value={blocked} icon={PauseCircle} tone="rose" />
      </div>

      <div className="mt-6">
        <HotelsTable hotels={serialize(hotels)} />
      </div>
    </>
  );
}
