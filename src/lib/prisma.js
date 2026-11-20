import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

/**
 * Adds connection settings suited to serverless + a cloud database, unless the URL already has them:
 * - connect_timeout: a cold start's first TLS connection can take a few seconds; don't fail it at 5s.
 * - pool_timeout: wait for a free connection instead of erroring under a burst of queries.
 * - connection_limit: each serverless instance needs only a few connections.
 */
function tunedUrl(url) {
  if (!url || !url.startsWith("mysql://")) return url;
  const u = new URL(url);
  const defaults = { connect_timeout: "30", pool_timeout: "30", connection_limit: "5" };
  for (const [key, value] of Object.entries(defaults)) {
    if (!u.searchParams.has(key)) u.searchParams.set(key, value);
  }
  return u.toString();
}

/** Single PrismaClient per server instance (also survives hot reloads in development). */
export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    datasourceUrl: tunedUrl(process.env.DATABASE_URL),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.__prisma = prisma;
