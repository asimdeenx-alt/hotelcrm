import "server-only";
import { prisma } from "./prisma";
import { DEFAULT_SETTINGS } from "./constants";

/**
 * Returns one hotel's settings merged over defaults. `hotelName` always comes from the Hotel row.
 * @param {number} hotelId
 */
export async function getSettings(hotelId) {
  if (!hotelId) return { ...DEFAULT_SETTINGS };
  const [rows, hotel] = await Promise.all([
    prisma.setting.findMany({ where: { hotelId } }),
    prisma.hotel.findUnique({ where: { id: hotelId }, select: { name: true } }),
  ]);
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULT_SETTINGS, ...stored, hotelName: hotel?.name ?? DEFAULT_SETTINGS.hotelName };
}

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
