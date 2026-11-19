// Edge-safe JWT helpers (used by proxy.js and server code). No Node-only imports here.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "hcrm_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long.");
  }
  return new TextEncoder().encode(secret);
}

/** @param {{ id: number, name: string, email: string, role: string }} user */
export async function signSession(user) {
  return new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

/** Returns the decoded session or null if the token is missing/invalid/expired. */
export async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: Number(payload.sub),
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
