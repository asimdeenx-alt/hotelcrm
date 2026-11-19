import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

/** Single PrismaClient instance, reused across hot reloads in development. */
export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;
