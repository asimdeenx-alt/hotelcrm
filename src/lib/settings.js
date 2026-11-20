import "server-only";
import { cache } from "react";
import { prisma } from "./prisma";
import { DEFAULT_SETTINGS } from "./constants";

/**
 * Returns one hotel's settings merged over defaults. `hotelName` always comes from the Hotel row.
 * One database round trip, and memoised per request so the layout and page share it.
 * @param {number} hotelId
 */
export const getSettings = cache(async (hotelId) => {
  if (!hotelId) return { ...DEFAULT_SETTINGS };
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: { name: true, settings: { select: { key: true, value: true } } },
  });
  const stored = Object.fromEntries((hotel?.settings ?? []).map((r) => [r.key, r.value]));
  return { ...DEFAULT_SETTINGS, ...stored, hotelName: hotel?.name ?? DEFAULT_SETTINGS.hotelName };
});

/** @param {number} hotelId @param {Record<string, any>} values */
export async function saveSettings(hotelId, values) {
  const entries = Object.entries(values).filter(([key]) => key in DEFAULT_SETTINGS && key !== "hotelName");
  await prisma.$transaction([
    ...(values.hotelName ? [prisma.hotel.update({ where: { id: hotelId }, data: { name: values.hotelName } })] : []),
    ...entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { hotelId_key: { hotelId, key } },
        update: { value: String(value) },
        create: { hotelId, key, value: String(value) },
      })
    ),
  ]);
  return getSettings(hotelId);
}
