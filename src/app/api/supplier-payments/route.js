import { ApiError, ok, readJson, route } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { supplierPaymentSchema } from "@/lib/validators";

export const POST = route("purchases", async (request, { db }) => {
  const input = await readJson(request, supplierPaymentSchema);
  const supplier = await db.supplier.findUnique({ where: { id: input.supplierId }, select: { id: true } });
  if (!supplier) throw new ApiError(404, "Supplier not found.");
  if (input.billId) {
    const bill = await db.purchaseBill.findUnique({ where: { id: input.billId }, select: { supplierId: true } });
    if (!bill || bill.supplierId !== input.supplierId) throw new ApiError(404, "Bill not found for this supplier.");
  }
  const payment = await db.supplierPayment.create({ data: { ...input, date: parseDateOnly(input.date) } });
  return ok(payment, { status: 201 });
});
