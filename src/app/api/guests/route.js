import { ok, readJson, route } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { guestSchema } from "@/lib/validators";

export const GET = route("guests", async (request, { db: prisma }) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const take = Math.min(Number(searchParams.get("take")) || 20, 100);
  const guests = await prisma.guest.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    take,
  });
  return ok(guests);
});

export const POST = route("guests.manage", async (request, { db: prisma }) => {
  const data = await readJson(request, guestSchema);
  const guest = await prisma.guest.create({
    data: { ...data, dateOfBirth: data.dateOfBirth ? parseDateOnly(data.dateOfBirth) : null },
  });
  return ok(guest, { status: 201 });
});
