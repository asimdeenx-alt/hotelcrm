"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { formToObject, useApi } from "@/hooks/use-api";
import { CHARGE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import { formatMoney, humanize } from "@/lib/format";

export function ChargesPanel({ reservation, currency, canEdit }) {
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);
  const base = `/api/reservations/${reservation.id}/charges`;

  async function onSubmit(event) {
    event.preventDefault();
    try {
      await request(base, { method: "POST", body: formToObject(event.currentTarget), success: "Charge posted" });
      setOpen(false);
    } catch {}
  }

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold">Extras & charges</CardTitle>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus /> Post charge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post a charge</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="grid gap-4">
                <FormField label="Category" htmlFor="category">
                  <NativeSelect id="category" name="category" defaultValue="FOOD_BEVERAGE">
                    {CHARGE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {humanize(c)}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField label="Description" htmlFor="description">
                  <Input id="description" name="description" required placeholder="Room service — dinner" />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Unit price" htmlFor="unitPrice">
                    <Input id="unitPrice" name="unitPrice" type="number" min="0.01" step="0.01" required />
                  </FormField>
                  <FormField label="Quantity" htmlFor="quantity">
                    <Input id="quantity" name="quantity" type="number" min="1" defaultValue="1" required />
                  </FormField>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={pending}>
                    Post charge
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      {reservation.charges.length === 0 ? (
        <CardContent className="pb-6 text-sm text-muted-foreground">No extras posted to this folio.</CardContent>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Item</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="pr-6 text-right">Amount</TableHead>
              {canEdit && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservation.charges.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="pl-6">
                  <p>{c.description}</p>
                  <p className="text-xs text-muted-foreground">{humanize(c.category)}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(c.createdAt)}</TableCell>
                <TableCell className="text-right tabular-nums">{c.quantity}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">
                  {formatMoney(Number(c.unitPrice) * c.quantity, currency)}
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove charge"
                      disabled={pending}
                      onClick={() => request(`${base}/${c.id}`, { method: "DELETE", success: "Charge removed" }).catch(() => {})}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

export function PaymentsPanel({ reservation, currency, balance, canEdit }) {
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    try {
      await request(`/api/reservations/${reservation.id}/payments`, {
        method: "POST",
        body: formToObject(event.currentTarget),
        success: "Payment recorded",
      });
      setOpen(false);
    } catch {}
  }

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold">Payments</CardTitle>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus /> Record payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record a payment</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="grid gap-4">
                <FormField label="Amount" htmlFor="amount" hint={balance > 0 ? `Balance due: ${formatMoney(balance, currency)}` : undefined}>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={balance > 0 ? balance.toFixed(2) : ""}
                    required
                  />
                </FormField>
                <FormField label="Method" htmlFor="method">
                  <NativeSelect id="method" name="method" defaultValue="CARD">
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {humanize(m)}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField label="Reference" htmlFor="reference" hint="Card slip, transfer ID or receipt number (optional).">
                  <Input id="reference" name="reference" />
                </FormField>
                <DialogFooter>
                  <Button type="submit" disabled={pending}>
                    Record payment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      {reservation.payments.length === 0 ? (
        <CardContent className="pb-6 text-sm text-muted-foreground">No payments recorded yet.</CardContent>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Received by</TableHead>
              <TableHead className="pr-6 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservation.payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="pl-6">{formatDateTime(p.createdAt)}</TableCell>
                <TableCell>{humanize(p.method)}</TableCell>
                <TableCell className="text-muted-foreground">{p.reference || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.receivedBy?.name || "—"}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{formatMoney(p.amount, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
