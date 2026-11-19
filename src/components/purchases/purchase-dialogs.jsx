"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { formToObject, useApi } from "@/hooks/use-api";
import { PAYMENT_METHODS, PURCHASE_CATEGORIES } from "@/lib/constants";
import { localDateString } from "@/lib/dates";
import { formatMoney, humanize, round2 } from "@/lib/format";

const blankItem = () => ({ key: Math.random(), description: "", quantity: "1", unit: "", rate: "" });

/** New purchase bill with any number of item lines, tax, and optional payment now. */
export function NewBillDialog({ suppliers, currency }) {
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([blankItem()]);
  const [tax, setTax] = useState("0");
  const [paidNow, setPaidNow] = useState("0");
  const money = (v) => formatMoney(v, currency);

  const itemsTotal = round2(items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0));
  const total = round2(itemsTotal + (Number(tax) || 0));
  const update = (key, field, value) => setItems((list) => list.map((i) => (i.key === key ? { ...i, [field]: value } : i)));

  async function onSubmit(event) {
    event.preventDefault();
    const form = formToObject(event.currentTarget);
    try {
      await request("/api/purchases", {
        method: "POST",
        body: {
          supplierId: form.supplierId,
          billNo: form.billNo,
          billDate: form.billDate,
          category: form.category,
          notes: form.notes,
          method: form.method,
          taxAmount: tax || 0,
          paidNow: paidNow || 0,
          items: items.map(({ description, quantity, unit, rate }) => ({ description, quantity, unit, rate })),
        },
        success: "Purchase bill saved",
      });
      setOpen(false);
      setItems([blankItem()]);
      setTax("0");
      setPaidNow("0");
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!suppliers.length} title={suppliers.length ? undefined : "Add a supplier first"}>
          <Plus /> New purchase bill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New purchase bill</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Supplier" htmlFor="pb-supplier" className="sm:col-span-2">
              <NativeSelect id="pb-supplier" name="supplierId" required>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Bill no." htmlFor="pb-no">
              <Input id="pb-no" name="billNo" required />
            </FormField>
            <FormField label="Bill date" htmlFor="pb-date">
              <Input id="pb-date" name="billDate" type="date" defaultValue={localDateString()} required />
            </FormField>
            <FormField label="Category" htmlFor="pb-cat" className="sm:col-span-2">
              <NativeSelect id="pb-cat" name="category" defaultValue="Kitchen">
                {PURCHASE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Notes" htmlFor="pb-notes" className="sm:col-span-2">
              <Input id="pb-notes" name="notes" />
            </FormField>
          </div>

          <div className="rounded-xl border">
            <div className="grid grid-cols-[1fr_80px_80px_110px_110px_36px] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span>Item</span>
              <span>Qty</span>
              <span>Unit</span>
              <span>Rate</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            {items.map((i) => (
              <div key={i.key} className="grid grid-cols-[1fr_80px_80px_110px_110px_36px] items-center gap-2 px-3 py-2">
                <Input aria-label="Item" value={i.description} onChange={(e) => update(i.key, "description", e.target.value)} required placeholder="Rice, detergent, bulbs…" />
                <Input aria-label="Quantity" type="number" min="0.001" step="0.001" value={i.quantity} onChange={(e) => update(i.key, "quantity", e.target.value)} required />
                <Input aria-label="Unit" value={i.unit} onChange={(e) => update(i.key, "unit", e.target.value)} placeholder="kg" />
                <Input aria-label="Rate" type="number" min="0" step="0.01" value={i.rate} onChange={(e) => update(i.key, "rate", e.target.value)} required />
                <span className="text-right text-sm tabular-nums">{money((Number(i.quantity) || 0) * (Number(i.rate) || 0))}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Remove item"
                  disabled={items.length === 1}
                  onClick={() => setItems((list) => list.filter((x) => x.key !== i.key))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            <div className="border-t px-3 py-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setItems((list) => [...list, blankItem()])}>
                <Plus /> Add item
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Tax / GST amount" htmlFor="pb-tax">
              <Input id="pb-tax" type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
            </FormField>
            <FormField label="Paid now" htmlFor="pb-paid" hint="0 if paying later.">
              <Input id="pb-paid" type="number" min="0" step="0.01" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} />
            </FormField>
            <FormField label="Payment method" htmlFor="pb-method">
              <NativeSelect id="pb-method" name="method" defaultValue="CASH">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {humanize(m)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <div className="flex flex-col justify-end rounded-xl bg-brand-tint px-4 py-2 text-right">
              <span className="text-xs text-muted-foreground">Bill total</span>
              <span className="text-xl font-bold tabular-nums text-brand">{money(total)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              Save bill
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Pay a supplier, optionally against a specific bill. */
export function PaySupplierDialog({ supplierId, billId, due, label = "Pay", currency }) {
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    try {
      await request("/api/supplier-payments", {
        method: "POST",
        body: { ...formToObject(event.currentTarget), supplierId, billId: billId ?? null },
        success: "Payment recorded",
      });
      setOpen(false);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Wallet /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record supplier payment</DialogTitle>
          {due > 0 && <DialogDescription>Due: {formatMoney(due, currency)}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Amount" htmlFor="sp-amount">
            <Input id="sp-amount" name="amount" type="number" min="0.01" step="0.01" defaultValue={due > 0 ? due.toFixed(2) : ""} required />
          </FormField>
          <FormField label="Date" htmlFor="sp-date">
            <Input id="sp-date" name="date" type="date" defaultValue={localDateString()} required />
          </FormField>
          <FormField label="Method" htmlFor="sp-method">
            <NativeSelect id="sp-method" name="method" defaultValue="CASH">
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {humanize(m)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Reference" htmlFor="sp-ref">
            <Input id="sp-ref" name="reference" placeholder="Cheque / UTR no." />
          </FormField>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              Save payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Create (no `supplier`) or edit a supplier. */
export function SupplierFormDialog({ supplier }) {
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);
  const s = supplier ?? {};

  async function onSubmit(event) {
    event.preventDefault();
    try {
      await request(supplier ? `/api/suppliers/${supplier.id}` : "/api/suppliers", {
        method: supplier ? "PATCH" : "POST",
        body: formToObject(event.currentTarget),
        success: supplier ? "Supplier updated" : "Supplier added",
      });
      setOpen(false);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {supplier ? (
          <Button size="icon" variant="ghost" className="size-8" aria-label={`Edit ${supplier.name}`}>
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button variant="outline">
            <Plus /> Add supplier
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? `Edit ${supplier.name}` : "Add supplier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Supplier name" htmlFor="su-name" className="sm:col-span-2">
            <Input id="su-name" name="name" defaultValue={s.name ?? ""} required />
          </FormField>
          <FormField label="Phone" htmlFor="su-phone">
            <Input id="su-phone" name="phone" defaultValue={s.phone ?? ""} />
          </FormField>
          <FormField label="GSTIN" htmlFor="su-gst">
            <Input id="su-gst" name="gstin" defaultValue={s.gstin ?? ""} />
          </FormField>
          <FormField label="Email" htmlFor="su-email" className="sm:col-span-2">
            <Input id="su-email" name="email" type="email" defaultValue={s.email ?? ""} />
          </FormField>
          <FormField label="Address" htmlFor="su-address" className="sm:col-span-2">
            <Textarea id="su-address" name="address" rows={2} defaultValue={s.address ?? ""} />
          </FormField>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {supplier ? "Save" : "Add supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteButton({ url, confirmText, success, label = "Delete" }) {
  const { request, pending } = useApi();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
      disabled={pending}
      onClick={() => {
        if (confirm(confirmText)) request(url, { method: "DELETE", success }).catch(() => {});
      }}
    >
      <Trash2 className="size-3.5" /> {label}
    </Button>
  );
}
