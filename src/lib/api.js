import "server-only";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { getContext } from "./auth";
import { can } from "./permissions";
import { prisma } from "./prisma";
import { forHotel } from "./tenant";

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function ok(data, init) {
  return NextResponse.json(serialize(data), init);
}

/** Converts Prisma Decimal / Date values into JSON-safe primitives. */
export function serialize(data) {
  return JSON.parse(JSON.stringify(data ?? null));
}

/**
 * Wraps a Route Handler with authentication, tenancy, permission checks and error handling.
 * The handler receives (request, { params, session, db }):
 * - for hotel permissions, `db` is a Prisma client locked to the user's hotel (see tenant.js);
 * - for the "platform" permission, `db` is the unscoped client (platform owner only).
 * @param {string} permission permission from permissions.js ("hotel" = any hotel user)
 * @param {(req: Request, ctx: { params: object, session: object, db: object }) => Promise<Response>} handler
 */
export function route(permission, handler) {
  if (!permission) throw new Error("route() requires a permission");
  return async (request, context) => {
    try {
      const ctx = await getContext();
      if (!ctx) throw new ApiError(401, "You must be signed in.");
      if (ctx.blocked) throw new ApiError(403, ctx.blocked);
      const { session } = ctx;
      if (!can(session.role, permission)) throw new ApiError(403, "You do not have permission to do that.");

      let db;
      if (permission === "platform") db = prisma;
      else if (session.hotelId) db = forHotel(session.hotelId);
      else throw new ApiError(403, "This account is not linked to a hotel.");

      const params = context?.params ? await context.params : {};
      return await handler(request, { params, session, db });
    } catch (error) {
      return handleError(error);
    }
  };
}

export function handleError(error) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const field = first?.path?.join(".");
    return NextResponse.json(
      { error: field ? `${field}: ${first.message}` : first?.message || "Invalid input", details: error.issues },
      { status: 422 }
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = [].concat(error.meta?.target ?? []).join(", ");
      return NextResponse.json({ error: `A record with this ${target || "value"} already exists.` }, { status: 409 });
    }
    if (error.code === "P2025") return NextResponse.json({ error: "Record not found." }, { status: 404 });
    if (error.code === "P2003") {
      return NextResponse.json({ error: "This record is linked to other records and cannot be changed." }, { status: 409 });
    }
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function readJson(request, schema) {
  let body;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
  return schema ? schema.parse(body) : body;
}

/**
 * For PATCH: validates with `schema.partial()` and keeps only the keys present in the
 * request body, so preprocessors/defaults can never touch fields the client didn't send.
 */
export async function readPartial(request, schema) {
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "Request body must be an object.");
  const parsed = schema.partial().parse(body);
  return Object.fromEntries(Object.entries(parsed).filter(([key]) => Object.hasOwn(body, key)));
}

export function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "Invalid id.");
  return id;
}
