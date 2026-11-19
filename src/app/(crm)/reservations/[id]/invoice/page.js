import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/shared/print-button";
import { Button } from "@/components/ui/button";
import { requirePageSession } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/dates";
import { computeFolio } from "@/lib/folio";
import { formatMoney, fullName, humanize } from "@/lib/format";
import { forHotel } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";
import { reservationInclude } from "@/services/reservations";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }) {
  const session = await requirePageSession("reservations");
  const prisma = forHotel(session.hotelId);
  const { id } = await params;
  const r = await prisma.reservation.findUnique({ where: { id: Number(id) || 0 }, include: reservationInclude });
  if (!r) notFound();
  const settings = await getSettings(session.hotelId);
  const folio = computeFolio(r, settings.taxRate);
  const money = (v) => formatMoney(v, settings.currency);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex justify-between print:hidden">
        <Button variant="ghost" asChild>
          <Link href={`/reservations/${r.id}`}>← Back to reservation</Link>
        </Button>
        <PrintButton />
      </div>

      <article className="rounded-lg border bg-card p-8 shadow-sm sm:p-12 print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col justify-between gap-6 border-b pb-8 sm:flex-row">
          <div>
            <p className="font-display text-3xl">{settings.hotelName}</p>
            <p className="mt-2 text-sm text-muted-foreground">{settings.address}</p>
            <p className="text-sm text-muted-foreground">
              {settings.phone} · {settings.email}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-[0.25em] text-primary">Invoice</p>
            <p className="mt-1 font-mono text-sm">{r.code}</p>
            <p className="mt-1 text-sm text-muted-foreground">Issued {formatDate(new Date())}</p>
          </div>
        </header>

        <section className="grid gap-6 py-8 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Billed to</p>
            <p className="mt-1 font-medium">{fullName(r.guest)}</p>
            {r.guest.company && <p className="text-sm">{r.guest.company}</p>}
            {r.guest.address && <p className="whitespace-pre-line text-sm text-muted-foreground">{r.guest.address}</p>}
            {r.guest.email && <p className="text-sm text-muted-foreground">{r.guest.email}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Stay</p>
            <p className="mt-1 text-sm">
              Room {r.room.number} · {r.room.roomType.name}
            </p>
            <p className="text-sm">
              {formatDate(r.checkIn)} – {formatDate(r.checkOut)} ({folio.nights} night{folio.nights === 1 ? "" : "s"})
            </p>
          </div>
        </section>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Unit</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-3">Accommodation — {r.room.roomType.name}</td>
              <td className="py-3 text-right tabular-nums">{folio.nights}</td>
              <td className="py-3 text-right tabular-nums">{money(r.rate)}</td>
              <td className="py-3 text-right tabular-nums">{money(folio.roomTotal)}</td>
            </tr>
            {r.charges.map((c) => (
              <tr key={c.id}>
                <td className="py-3">
                  {c.description} <span className="text-muted-foreground">· {humanize(c.category)}</span>
                </td>
                <td className="py-3 text-right tabular-nums">{c.quantity}</td>
                <td className="py-3 text-right tabular-nums">{money(c.unitPrice)}</td>
                <td className="py-3 text-right tabular-nums">{money(Number(c.unitPrice) * c.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
          {folio.discount > 0 && <Row label="Discount" value={`− ${money(folio.discount)}`} />}
          <Row label="Subtotal" value={money(folio.subtotal)} />
          <Row label={`Tax (${settings.taxRate}%)`} value={money(folio.tax)} />
          <Row label="Total" value={money(folio.total)} strong />
          <Row label="Paid" value={money(folio.paid)} />
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <span>Balance due</span>
            <span className="tabular-nums">{money(folio.balance)}</span>
          </div>
        </div>

        {r.payments.length > 0 && (
          <section className="mt-10">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Payments received</p>
            <ul className="space-y-1 text-sm">
              {r.payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>
                    {formatDateTime(p.createdAt)} · {humanize(p.method)}
                    {p.reference && ` · ${p.reference}`}
                  </span>
                  <span className="tabular-nums">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
          Thank you for staying with {settings.hotelName}.
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className={`flex justify-between ${strong ? "font-medium" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
