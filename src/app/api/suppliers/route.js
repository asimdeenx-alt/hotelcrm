import { ok, readJson, route } from "@/lib/api";
import { supplierSchema } from "@/lib/validators";

export const GET = route("purchases", async (_req, { db }) => {
  return ok(await db.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }));
});

export const POST = route("purchases", async (request, { db }) => {
  const data = await readJson(request, supplierSchema);
  return ok(await db.supplier.create({ data }), { status: 201 });
});
