import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton, PaySupplierDialog } from "@/components/purchases/purchase-dialogs";
import { PrintButton } from "@/components/shared/print-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { requirePageSession } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { formatMoney, humanize, round2 } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Purchase bill" };

export default async function PurchaseBillPage({ params }) {
  const session = await requirePageSession("purchases");
  const prisma = forHotel(session.hotelId);
  const { id } = await params;
  const bill = await prisma.purchaseBill.findUnique({
    where: { id: Number(id) || 0 },
    include: { supplier: true, items: true, payments: { orderBy: { date: "asc" } } },
  });
  if (!bill) notFound();
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);
  const itemsTotal = round2(bill.items.reduce((s, i) => s + Number(i.quantity) * Number(i.rate), 0));
  const paid = round2(bill.payments.reduce((s, p) => s + Number(p.amount), 0));
  const due = round2(Number(bill.total) - paid);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap justify-between gap-2 print:hidden">
        <Button variant="ghost" asChild>
          <Link href="/purchases">← All purchases</Link>
        </Button>
        <div className="flex gap-2">
          {due > 0.009 && <PaySupplierDialog supplierId={bill.supplierId} billId={bill.id} due={due} currency={settings.currency} />}
          {bill.payments.length === 0 && (
            <DeleteButton url={`/api/purchases/${bill.id}`} confirmText="Delete this purchase bill?" success="Bill deleted" />
          )}
          <PrintButton />
        </div>
      </div>

      <article className="rounded-2xl border bg-card p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Purchase bill</p>
            <p className="mt-1 text-2xl font-bold">{bill.supplier.name}</p>
            {bill.supplier.gstin && <p className="text-sm text-muted-foreground">GSTIN {bill.supplier.gstin}</p>}
            {bill.supplier.phone && <p className="text-sm text-muted-foreground">{bill.supplier.phone}</p>}
          </div>
          <div className="sm:text-right">
            <p className="font-mono text-sm">Bill no. {bill.billNo}</p>
            <p className="text-sm text-muted-foreground">{formatDate(bill.billDate)}</p>
            <p className="text-sm text-muted-foreground">{bill.category}</p>
            <div className="mt-2">
              <StatusBadge value={paid <= 0 ? "UNPAID" : due > 0.009 ? "PARTIAL" : "PAID"} />
            </div>
          </div>
        </header>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bill.items.map((i) => (
              <tr key={i.id}>
                <td className="py-2.5">{i.description}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {Number(i.quantity)} {i.unit}
                </td>
                <td className="py-2.5 text-right tabular-nums">{money(i.rate)}</td>
                <td className="py-2.5 text-right tabular-nums">{money(Number(i.quantity) * Number(i.rate))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
          <Row label="Items total" value={money(itemsTotal)} />
          <Row label="Tax / GST" value={money(bill.taxAmount)} />
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Bill total</span>
            <span className="tabular-nums">{money(bill.total)}</span>
          </div>
          <Row label="Paid" value={money(paid)} />
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Due</span>
            <span className={`tabular-nums ${due > 0.009 ? "text-rose-600" : ""}`}>{money(due)}</span>
          </div>
        </div>

        {bill.payments.length > 0 && (
          <section className="mt-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payments</p>
            <ul className="space-y-1.5 text-sm">
              {bill.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span>
                    {formatDate(p.date)} · {humanize(p.method)}
                    {p.reference && ` · ${p.reference}`}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">{money(p.amount)}</span>
                    <span className="print:hidden">
                      <DeleteButton url={`/api/supplier-payments/${p.id}`} confirmText="Delete this payment?" success="Payment deleted" label="" />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {bill.notes && <p className="mt-6 text-sm text-muted-foreground">Notes: {bill.notes}</p>}
      </article>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
