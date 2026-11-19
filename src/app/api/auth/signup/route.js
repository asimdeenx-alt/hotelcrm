import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { ApiError, handleError, ok, readJson } from "@/lib/api";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { TRIAL_DAYS } from "@/lib/hotel-access";
import { signupSchema } from "@/lib/validators";

/**
 * Hotel registration: creates a new hotel on a free trial plus its owner (ADMIN) account,
 * then signs the owner in. Staff are added later by the hotel admin from the Staff page.
 */
export async function POST(request) {
  try {
    const { hotelName, name, email, phone, password } = await readJson(request, signupSchema);
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email }, select: { id: true } })) {
        throw new ApiError(409, "An account with this email already exists. Sign in instead.");
      }
      const hotel = await tx.hotel.create({
        data: {
          name: hotelName,
          email,
          phone: phone ?? null,
          status: "TRIAL",
          plan: "Trial",
          subscriptionEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400000),
        },
      });
      await tx.setting.createMany({
        data: [
          { hotelId: hotel.id, key: "email", value: email },
          { hotelId: hotel.id, key: "phone", value: phone ?? "" },
          { hotelId: hotel.id, key: "address", value: "" },
          { hotelId: hotel.id, key: "currency", value: DEFAULT_SETTINGS.currency },
        ],
      });
      return tx.user.create({ data: { hotelId: hotel.id, name, email, passwordHash, role: "ADMIN" } });
    });

    await createSession(user);
    return ok({ hotelId: user.hotelId, home: "/" }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
