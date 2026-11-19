"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { formToObject, useApi } from "@/hooks/use-api";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { localDateString } from "@/lib/dates";
import { humanize } from "@/lib/format";

/** Record other income or an expense. */
export function EntryDialog({ type }) {
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);
  const income = type === "INCOME";
  const categories = income ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function onSubmit(event) {
    event.preventDefault();
    try {
      await request("/api/accounts", {
        method: "POST",
        body: { ...formToObject(event.currentTarget), type },
        success: income ? "Income recorded" : "Expense recorded",
      });
      setOpen(false);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {income ? (
          <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
            <Plus /> Add income
          </Button>
        ) : (
          <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800">
            <Minus /> Add expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{income ? "Add other income" : "Add expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Category" htmlFor="ae-cat">
            <NativeSelect id="ae-cat" name="category" defaultValue={categories[0]}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Date" htmlFor="ae-date">
            <Input id="ae-date" name="date" type="date" defaultValue={localDateString()} required />
          </FormField>
          <FormField label="Description" htmlFor="ae-desc" className="sm:col-span-2">
            <Input id="ae-desc" name="description" required placeholder={income ? "Birthday party hall booking" : "November electricity bill"} />
          </FormField>
          <FormField label="Amount" htmlFor="ae-amount">
            <Input id="ae-amount" name="amount" type="number" min="0.01" step="0.01" required />
          </FormField>
          <FormField label="Method" htmlFor="ae-method">
            <NativeSelect id="ae-method" name="method" defaultValue="CASH">
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {humanize(m)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Reference" htmlFor="ae-ref" className="sm:col-span-2">
            <Input id="ae-ref" name="reference" placeholder="Bill / receipt / UTR no." />
          </FormField>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteEntryButton({ id }) {
  const { request, pending } = useApi();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7"
      aria-label="Delete entry"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this entry?")) request(`/api/accounts/${id}`, { method: "DELETE", success: "Entry deleted" }).catch(() => {});
      }}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
