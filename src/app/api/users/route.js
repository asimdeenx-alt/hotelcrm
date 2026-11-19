import bcrypt from "bcryptjs";
import { ok, readJson, route } from "@/lib/api";
import { userCreateSchema } from "@/lib/validators";

const publicUserFields = { id: true, name: true, email: true, role: true, active: true, createdAt: true };

// Any signed-in user can list staff (used for task assignment).
export const GET = route("hotel", async (_req, { db: prisma }) => {
  return ok(await prisma.user.findMany({ select: publicUserFields, orderBy: { name: "asc" } }));
});

export const POST = route("staff", async (request, { db: prisma }) => {
  const { password, ...data } = await readJson(request, userCreateSchema);
  const user = await prisma.user.create({
    data: { ...data, passwordHash: await bcrypt.hash(password, 10) },
    select: publicUserFields,
  });
  return ok(user, { status: 201 });
});
