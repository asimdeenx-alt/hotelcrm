"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { formToObject, useApi } from "@/hooks/use-api";
import { formatDate, localDateString } from "@/lib/dates";
import { formatMoney, fullName } from "@/lib/format";

const TYPE_LABELS = {
  PAYMENT: "Payment received from agent",
  INVOICE: "Invoice / amount billed to agent",
  COMMISSION: "Commission credited to agent",
  ADJUSTMENT: "Adjustment (+ owes more, − owes less)",
};

export function AgentLedger({ agentId, ledger, opening, currency }) {
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);
  const money = (v) => formatMoney(v, currency);

  async function onSubmit(event) {
    event.preventDefault();
    try {
      await request(`/api/agents/${agentId}/transactions`, { method: "POST", body: formToObject(event.currentTarget), success: "Entry added" });
      setOpen(false);
    } catch {}
  }

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Account ledger</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus /> Add entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add ledger entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Type" htmlFor="tx-type" className="sm:col-span-2">
                <NativeSelect id="tx-type" name="type" defaultValue="PAYMENT">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Amount" htmlFor="tx-amount">
                <Input id="tx-amount" name="amount" type="number" step="0.01" required />
              </FormField>
              <FormField label="Date" htmlFor="tx-date">
                <Input id="tx-date" name="date" type="date" defaultValue={localDateString()} required />
              </FormField>
              <FormField label="Reference" htmlFor="tx-ref" className="sm:col-span-2" hint="Cheque / UTR / invoice number">
                <Input id="tx-ref" name="reference" />
              </FormField>
              <FormField label="Notes" htmlFor="tx-notes" className="sm:col-span-2">
                <Input id="tx-notes" name="notes" />
              </FormField>
              <DialogFooter className="sm:col-span-2">
                <Button type="submit" disabled={pending}>
                  Save entry
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Reference / notes</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="w-10 pr-6" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {ledger.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="pl-6 whitespace-nowrap">{formatDate(t.date)}</TableCell>
              <TableCell>
                <StatusBadge value={t.type} />
              </TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">{[t.reference, t.notes].filter(Boolean).join(" · ") || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{money(t.amount)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{money(t.balance)}</TableCell>
              <TableCell className="pr-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Delete entry"
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Delete this ledger entry?")) {
                      request(`/api/agents/${agentId}/transactions/${t.id}`, { method: "DELETE", success: "Entry deleted" }).catch(() => {});
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="pl-6 text-muted-foreground" colSpan={4}>
              Opening balance
            </TableCell>
            <TableCell className="text-right tabular-nums">{money(opening)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}

export function AgentBookings({ agentId, bookings, currency }) {
  const { request, pending } = useApi();
  const money = (v) => formatMoney(v, currency);

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Bookings through this agent</CardTitle>
        <p className="text-sm text-muted-foreground">
          &ldquo;Bill to agent&rdquo; adds the unpaid bill to the agent&apos;s account and credits their commission.
        </p>
      </CardHeader>
      {bookings.length === 0 ? (
        <p className="border-t px-6 py-5 text-sm text-muted-foreground">No bookings yet. Choose this agent when creating a reservation.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Booking</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Stay</TableHead>
              <TableHead className="text-right">Bill total</TableHead>
              <TableHead className="text-right">Unpaid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pl-6 font-mono text-xs">
                  <Link href={`/reservations/${r.id}`} className="hover:underline">
                    {r.code}
                  </Link>
                </TableCell>
                <TableCell>
                  {fullName(r.guest)} <span className="text-muted-foreground">· Room {r.room.number}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(r.checkIn)} → {formatDate(r.checkOut)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(r.folio.total)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(Math.max(0, r.folio.balance))}</TableCell>
                <TableCell>
                  <StatusBadge value={r.status} />
                </TableCell>
                <TableCell className="pr-6 text-right">
                  {r.billed ? (
                    <StatusBadge value="BILLED" label="Billed" tone="success" />
                  ) : ["CHECKED_IN", "CHECKED_OUT"].includes(r.status) && r.folio.balance > 0.009 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        request(`/api/agents/${agentId}/bill`, {
                          method: "POST",
                          body: { reservationId: r.id },
                          success: `${r.code} billed to agent`,
                        }).catch(() => {})
                      }
                    >
                      Bill to agent
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
