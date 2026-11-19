import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { ApiError, handleError, ok, readJson } from "@/lib/api";
import { hotelAccess } from "@/lib/hotel-access";
import { loginSchema } from "@/lib/validators";

export async function POST(request) {
  try {
    const { email, password } = await readJson(request, loginSchema);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { hotel: { select: { status: true, subscriptionEndsAt: true } } },
    });
    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!valid) throw new ApiError(401, "Invalid email or password.");
    if (!user.active) throw new ApiError(403, "This account has been deactivated. Contact your hotel administrator.");

    // Hotel staff can only sign in while their hotel's subscription is valid.
    if (user.role !== "SUPER_ADMIN") {
      const access = hotelAccess(user.hotel);
      if (!access.allowed) throw new ApiError(403, access.reason);
    }

    await createSession(user);
    return ok({ id: user.id, name: user.name, role: user.role, home: user.role === "SUPER_ADMIN" ? "/platform" : "/" });
  } catch (error) {
    return handleError(error);
  }
}
