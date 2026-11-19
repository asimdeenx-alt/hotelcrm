import { ApiError, ok, readJson, route } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { round2 } from "@/lib/format";
import { purchaseBillSchema } from "@/lib/validators";

/** Records a purchase bill with its line items, and optionally a payment made on the spot. */
export const POST = route("purchases", async (request, { db }) => {
  const { items, paidNow, method, supplierId, billDate, taxAmount, ...rest } = await readJson(request, purchaseBillSchema);
  const itemsTotal = round2(items.reduce((s, i) => s + i.quantity * i.rate, 0));
  const total = round2(itemsTotal + taxAmount);
  if (paidNow > total + 0.009) throw new ApiError(422, "Amount paid now cannot be more than the bill total.");

  const bill = await db.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
    if (!supplier) throw new ApiError(404, "Supplier not found.");
    const created = await tx.purchaseBill.create({
      data: {
        ...rest,
        supplierId,
        billDate: parseDateOnly(billDate),
        taxAmount,
        total,
        items: { create: items.map((i) => ({ ...i, unit: i.unit ?? null })) },
      },
    });
    if (paidNow > 0) {
      await tx.supplierPayment.create({
        data: { supplierId, billId: created.id, amount: paidNow, method, date: parseDateOnly(billDate), reference: `Bill ${rest.billNo}` },
      });
    }
    return created;
  });

  return ok(bill, { status: 201 });
});
