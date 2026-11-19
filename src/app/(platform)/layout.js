import { AppShell } from "@/components/layout/app-shell";
import { requirePageSession } from "@/lib/auth";

export default async function PlatformLayout({ children }) {
  const session = await requirePageSession("platform");
  return (
    <AppShell session={session} hotelName="Platform Admin">
      {children}
    </AppShell>
  );
}
