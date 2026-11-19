import { ok, readJson, route } from "@/lib/api";
import { getSettings, saveSettings } from "@/lib/settings";
import { settingsSchema } from "@/lib/validators";

export const GET = route("hotel", async (_req, { session }) => ok(await getSettings(session.hotelId)));

export const PUT = route("settings", async (request, { session }) => {
  const data = await readJson(request, settingsSchema);
  return ok(await saveSettings(session.hotelId, data));
});
