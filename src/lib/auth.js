import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";
import { can } from "./permissions";
import { prisma } from "./prisma";
import { hotelAccess } from "./hotel-access";

export async function createSession(user) {
  const token = await signSession(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Loads the signed-in user and their hotel fresh from the database (once per request),
 * so deactivated users and suspended/expired hotels are locked out immediately.
 * @returns {Promise<null | { session: object, hotel: object | null, blocked: string | null }>}
 */
export const getContext = cache(async () => {
  const token = await getSession();
  if (!token) return null;
  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      hotelId: true,
      hotel: { select: { id: true, name: true, status: true, plan: true, subscriptionEndsAt: true } },
    },
  });
  if (!user || !user.active) return null;

  const session = { id: user.id, name: user.name, email: user.email, role: user.role, hotelId: user.hotelId };
  if (user.role === "SUPER_ADMIN") return { session, hotel: null, blocked: null };

  const access = hotelAccess(user.hotel);
  return { session, hotel: user.hotel, blocked: access.allowed ? null : access.reason };
});

/**
 * For Server Components: returns the session (with hotelId) or redirects.
 * - signed out → /login
 * - hotel suspended/expired → /suspended
 * - platform owner on hotel pages → /platform, hotel staff on platform pages → /
 * @param {string} [permission]
 */
export async function requirePageSession(permission) {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  if (ctx.blocked) redirect("/suspended");

  const { session } = ctx;
  if (session.role === "SUPER_ADMIN" && permission !== "platform") redirect("/platform");
  if (session.role !== "SUPER_ADMIN" && permission === "platform") redirect("/");
  if (permission && !can(session.role, permission)) redirect("/?denied=1");
  return session;
}
