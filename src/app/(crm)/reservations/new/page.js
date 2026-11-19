import { ReservationForm } from "@/components/reservations/reservation-form";
import { PageHeader } from "@/components/shared/page-header";
import { requirePageSession } from "@/lib/auth";
import { serialize } from "@/lib/api";
import { forHotel } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "New reservation" };

export default async function NewReservationPage({ searchParams }) {
  const session = await requirePageSession("reservations.manage");
  const prisma = forHotel(session.hotelId);
  const { guestId } = await searchParams;
  const settings = await getSettings(session.hotelId);
  const guest = guestId ? await prisma.guest.findUnique({ where: { id: Number(guestId) || 0 } }) : null;

  return (
    <>
      <PageHeader
        eyebrow="Reservations"
        title="New reservation"
        description="Choose dates, pick an available room and attach a guest profile."
      />
      <ReservationForm currency={settings.currency} initialGuest={serialize(guest)} />
    </>
  );
}
