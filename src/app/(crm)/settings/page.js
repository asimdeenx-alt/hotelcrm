import { SettingsForm } from "@/components/settings/settings-form";
import { PageHeader } from "@/components/shared/page-header";
import { requirePageSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requirePageSession("settings");
  const settings = await getSettings(session.hotelId);
  return (
    <>
      <PageHeader eyebrow="Administration" title="Settings" description="Property details, currency, tax and loyalty rules." />
      <SettingsForm settings={settings} />
    </>
  );
}
