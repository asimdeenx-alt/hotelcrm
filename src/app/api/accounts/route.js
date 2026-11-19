import { ok, readJson, route } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { accountEntrySchema } from "@/lib/validators";

/** Other income / expense not captured elsewhere (electricity, rent, walk-in restaurant sales…). */
export const POST = route("accounts", async (request, { db, session }) => {
  const input = await readJson(request, accountEntrySchema);
  const entry = await db.accountEntry.create({
    data: { ...input, date: parseDateOnly(input.date), createdById: session.id },
  });
  return ok(entry, { status: 201 });
});
