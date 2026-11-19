"use client";

import { useState } from "react";
import { Undo2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { formToObject, useApi } from "@/hooks/use-api";
import { PAYMENT_METHODS } from "@/lib/constants";
import { localDateString } from "@/lib/dates";
import { formatMoney, humanize, round2 } from "@/lib/format";

export function PaySalaryDialog({ employee, month, gross, payableDays, days, currency }) {
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);
  const [deductions, setDeductions] = useState("0");
  const [bonus, setBonus] = useState("0");
  const net = round2(gross - (Number(deductions) || 0) + (Number(bonus) || 0));

  async function onSubmit(event) {
    event.preventDefault();
    try {
      await request("/api/salary", {
        method: "POST",
        body: { ...formToObject(event.currentTarget), employeeId: employee.id, month, deductions: deductions || 0, bonus: bonus || 0 },
        success: `Salary paid to ${employee.name}`,
      });
      setOpen(false);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Wallet /> Pay
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay salary · {employee.name}</DialogTitle>
          <DialogDescription>
            {payableDays} of {days} days payable → {formatMoney(gross, currency)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Deductions" htmlFor="sal-ded" hint="Advance, PF, loss…">
            <Input id="sal-ded" type="number" min="0" step="0.01" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
          </FormField>
          <FormField label="Bonus / overtime" htmlFor="sal-bonus">
            <Input id="sal-bonus" type="number" min="0" step="0.01" value={bonus} onChange={(e) => setBonus(e.target.value)} />
          </FormField>
          <FormField label="Paid on" htmlFor="sal-date">
            <Input id="sal-date" name="paidOn" type="date" defaultValue={localDateString()} required />
          </FormField>
          <FormField label="Method" htmlFor="sal-method">
            <NativeSelect id="sal-method" name="method" defaultValue="BANK_TRANSFER">
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {humanize(m)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Notes" htmlFor="sal-notes" className="sm:col-span-2">
            <Input id="sal-notes" name="notes" />
          </FormField>
          <div className="flex items-center justify-between rounded-xl bg-brand-tint px-4 py-3 sm:col-span-2">
            <span className="text-sm text-muted-foreground">Net pay</span>
            <span className="text-xl font-bold tabular-nums text-brand">{formatMoney(net, currency)}</span>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={pending || net < 0}>
              Confirm payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UndoSalaryButton({ paymentId, name }) {
  const { request, pending } = useApi();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-muted-foreground"
      disabled={pending}
      onClick={() => {
        if (confirm(`Undo the salary payment for ${name}?`)) {
          request(`/api/salary/${paymentId}`, { method: "DELETE", success: "Salary payment removed" }).catch(() => {});
        }
      }}
    >
      <Undo2 className="size-3.5" /> Undo
    </Button>
  );
}
