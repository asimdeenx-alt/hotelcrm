import { AppShell } from "@/components/layout/app-shell";
import { getContext, requirePageSession } from "@/lib/auth";
import { hotelAccess } from "@/lib/hotel-access";
import { getSettings } from "@/lib/settings";

export default async function CrmLayout({ children }) {
  const session = await requirePageSession();
  const [{ hotel }, settings] = await Promise.all([getContext(), getSettings(session.hotelId)]);

  // Remind hotel admins before a trial or subscription runs out.
  const { daysLeft } = hotelAccess(hotel);
  let notice = null;
  if (session.role === "ADMIN" && daysLeft !== null) {
    if (hotel.status === "TRIAL") {
      notice = `Free trial — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left. Contact support to activate your subscription.`;
    } else if (daysLeft <= 7) {
      notice = `Your subscription ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Contact support to renew.`;
    }
  }

  return (
    <AppShell session={session} hotelName={settings.hotelName} notice={notice}>
      {children}
    </AppShell>
  );
}
