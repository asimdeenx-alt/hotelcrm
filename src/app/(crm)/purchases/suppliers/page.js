import { CircleDollarSign, Store, Wallet } from "lucide-react";
import { NewBillDialog, PaySupplierDialog, SupplierFormDialog } from "@/components/purchases/purchase-dialogs";
import { PurchaseTabs } from "@/components/purchases/purchase-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { serialize } from "@/lib/api";
import { requirePageSession } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { formatMoney, round2 } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const session = await requirePageSession("purchases");
  const prisma = forHotel(session.hotelId);
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);

  const suppliers = await prisma.supplier.findMany({
    include: {
      bills: { select: { total: true, billDate: true } },
      payments: { select: { amount: true, date: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = suppliers.map((s) => {
    const billed = round2(s.bills.reduce((t, b) => t + Number(b.total), 0));
    const paid = round2(s.payments.reduce((t, p) => t + Number(p.amount), 0));
    const lastBill = s.bills.reduce((d, b) => (!d || b.billDate > d ? b.billDate : d), null);
    return { ...s, billed, paid, due: round2(billed - paid), lastBill };
  });
  const totalDue = rows.reduce((t, s) => t + Math.max(0, s.due), 0);
  const simple = rows.map(({ id, name }) => ({ id, name }));

  return (
    <>
      <PageHeader eyebrow="Operations" title="Purchases" description="Suppliers you buy from, what you have bought and what you still owe them.">
        <SupplierFormDialog />
        <NewBillDialog suppliers={simple} currency={settings.currency} />
      </PageHeader>
      <PurchaseTabs active="/purchases/suppliers" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Suppliers" value={rows.length} icon={Store} tone="brand" />
        <StatCard label="Total purchased (all time)" value={money(rows.reduce((t, s) => t + s.billed, 0))} icon={Wallet} tone="amber" />
        <StatCard label="You owe suppliers" value={money(totalDue)} icon={CircleDollarSign} tone="rose" />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No suppliers yet" description="Add the shops and vendors you buy stock from." />
        ) : (
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Last bill</TableHead>
                  <TableHead className="text-right">Bills</TableHead>
                  <TableHead className="text-right">Purchased</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-5">
                      <p className="font-medium">{s.name}</p>
                      {s.gstin && <p className="text-xs text-muted-foreground">GSTIN {s.gstin}</p>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{[s.phone, s.email].filter(Boolean).join(" · ") || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.lastBill ? formatDate(s.lastBill) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.bills.length}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(s.billed)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(s.paid)}</TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${s.due > 0.009 ? "text-rose-600" : ""}`}>{money(s.due)}</TableCell>
                    <TableCell className="pr-5">
                      <div className="flex justify-end gap-1">
                        {s.due > 0.009 && <PaySupplierDialog supplierId={s.id} due={s.due} label="Pay dues" currency={settings.currency} />}
                        <SupplierFormDialog supplier={serialize({ id: s.id, name: s.name, phone: s.phone, email: s.email, gstin: s.gstin, address: s.address })} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
