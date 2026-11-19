import Link from "next/link";
import { CircleDollarSign, Package, ShoppingCart, Wallet } from "lucide-react";
import { NewBillDialog, PaySupplierDialog, SupplierFormDialog } from "@/components/purchases/purchase-dialogs";
import { PurchaseTabs } from "@/components/purchases/purchase-tabs";
import { RangePicker } from "@/components/reports/date-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilters } from "@/components/shared/search-filters";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageSession } from "@/lib/auth";
import { addDays, formatDate, localDateString, parseDateOnly, safeDateParam } from "@/lib/dates";
import { formatMoney, round2 } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Purchases" };

export default async function PurchasesPage({ searchParams }) {
  const session = await requirePageSession("purchases");
  const prisma = forHotel(session.hotelId);
  const sp = await searchParams;
  const today = localDateString();
  let from = safeDateParam(sp.from, `${today.slice(0, 8)}01`);
  let to = safeDateParam(sp.to, today);
  if (to < from) [from, to] = [to, from];
  const status = ["PAID", "PARTIAL", "UNPAID"].includes(sp.status) ? sp.status : "";
  const q = (sp.q ?? "").trim();
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);

  const [bills, suppliers] = await Promise.all([
    prisma.purchaseBill.findMany({
      where: {
        billDate: { gte: parseDateOnly(from), lt: addDays(parseDateOnly(to), 1) },
        ...(q ? { OR: [{ billNo: { contains: q } }, { supplier: { name: { contains: q } } }, { category: { contains: q } }] } : {}),
      },
      include: { supplier: { select: { id: true, name: true } }, payments: { select: { amount: true } }, _count: { select: { items: true } } },
      orderBy: [{ billDate: "desc" }, { id: "desc" }],
      take: 500,
    }),
    prisma.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const all = bills.map((b) => {
    const paid = round2(b.payments.reduce((s, p) => s + Number(p.amount), 0));
    const due = round2(Number(b.total) - paid);
    return { ...b, paid, due, payStatus: paid <= 0 ? "UNPAID" : due > 0.009 ? "PARTIAL" : "PAID" };
  });
  const rows = status ? all.filter((b) => b.payStatus === status) : all;
  const totals = all.reduce((t, b) => ({ total: t.total + Number(b.total), paid: t.paid + b.paid, due: t.due + Math.max(0, b.due) }), { total: 0, paid: 0, due: 0 });

  return (
    <>
      <PageHeader eyebrow="Operations" title="Purchases" description="Store purchase bills from suppliers — kitchen, bar, housekeeping and maintenance stock.">
        <SupplierFormDialog />
        <NewBillDialog suppliers={suppliers} currency={settings.currency} />
      </PageHeader>
      <PurchaseTabs active="/purchases" />

      <div className="mb-5 flex justify-end">
        <RangePicker from={from} to={to} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bills in period" value={all.length} icon={Package} tone="brand" />
        <StatCard label="Purchases" value={money(totals.total)} icon={ShoppingCart} tone="amber" />
        <StatCard label="Paid" value={money(totals.paid)} icon={Wallet} tone="emerald" />
        <StatCard label="Unpaid" value={money(totals.due)} icon={CircleDollarSign} tone="rose" />
      </div>

      <div className="mt-6">
        <SearchFilters placeholder="Search bill no., supplier or category…" statuses={["PAID", "PARTIAL", "UNPAID"]} />
      </div>

      {suppliers.length === 0 ? (
        <EmptyState title="Add your first supplier" description="Suppliers are the shops and vendors you buy stock from. Then record their bills here." />
      ) : rows.length === 0 ? (
        <EmptyState title="No purchase bills in this period" description="Use “New purchase bill” to record one." />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Date</TableHead>
                <TableHead>Bill no.</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="pl-5 whitespace-nowrap">{formatDate(b.billDate)}</TableCell>
                  <TableCell>
                    <Link href={`/purchases/${b.id}`} className="font-medium text-primary hover:underline">
                      {b.billNo}
                    </Link>
                    <p className="text-xs text-muted-foreground">{b._count.items} item(s)</p>
                  </TableCell>
                  <TableCell>{b.supplier.name}</TableCell>
                  <TableCell className="text-muted-foreground">{b.category}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(b.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(b.paid)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${b.due > 0.009 ? "font-semibold text-rose-600" : ""}`}>{money(b.due)}</TableCell>
                  <TableCell>
                    <StatusBadge value={b.payStatus} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {b.due > 0.009 && <PaySupplierDialog supplierId={b.supplier.id} billId={b.id} due={b.due} currency={settings.currency} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-5" colSpan={4}>
                  Total ({rows.length} bills)
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(rows.reduce((s, b) => s + Number(b.total), 0))}</TableCell>
                <TableCell className="text-right tabular-nums">{money(rows.reduce((s, b) => s + b.paid, 0))}</TableCell>
                <TableCell className="text-right tabular-nums">{money(rows.reduce((s, b) => s + Math.max(0, b.due), 0))}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )}
    </>
  );
}
