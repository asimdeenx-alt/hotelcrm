import bcrypt from "bcryptjs";
import { ApiError, ok, parseId, readJson, route } from "@/lib/api";
import { userUpdateSchema } from "@/lib/validators";

export const PATCH = route("staff", async (request, { params, session, db: prisma }) => {
  const id = parseId(params.id);
  const { password, ...data } = await readJson(request, userUpdateSchema);
  if (id === session.id && (data.active === false || (data.role && data.role !== "ADMIN"))) {
    throw new ApiError(409, "You cannot deactivate or demote your own account.");
  }
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return ok(user);
});
