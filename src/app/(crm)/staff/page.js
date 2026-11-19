import { StaffManager } from "@/components/staff/staff-manager";
import { PageHeader } from "@/components/shared/page-header";
import { serialize } from "@/lib/api";
import { requirePageSession } from "@/lib/auth";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const session = await requirePageSession("staff");
  const prisma = forHotel(session.hotelId);
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  const list = users;
  return (
    <>
      <PageHeader eyebrow="Administration" title="Staff" description="Accounts and roles. Roles decide which parts of the CRM each person can use." />
      <StaffManager users={serialize(list)} currentUserId={session.id} />
    </>
  );
}
