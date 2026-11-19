import { nightsBetween } from "./dates";
import { round2 } from "./format";

/**
 * Computes the guest folio (bill) for a reservation.
 * Works on raw Prisma records or their serialized form (Decimals as strings).
 * @param {{ checkIn: any, checkOut: any, rate: any, discount?: any, charges?: any[], payments?: any[] }} reservation
 * @param {number|string} taxRatePercent
 */
export function computeFolio(reservation, taxRatePercent = 0) {
  const nights = nightsBetween(reservation.checkIn, reservation.checkOut);
  const roomTotal = round2(nights * Number(reservation.rate));
  const extras = round2(
    (reservation.charges ?? []).reduce((sum, c) => sum + Number(c.unitPrice) * Number(c.quantity), 0)
  );
  const discount = round2(Math.min(Number(reservation.discount ?? 0), roomTotal + extras));
  const subtotal = round2(roomTotal + extras - discount);
  const tax = round2((subtotal * Number(taxRatePercent || 0)) / 100);
  const total = round2(subtotal + tax);
  const paid = round2((reservation.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0));
  const balance = round2(total - paid);
  const paymentStatus = paid <= 0 ? "UNPAID" : balance > 0.009 ? "PARTIAL" : "PAID";

  return { nights, roomTotal, extras, discount, subtotal, tax, total, paid, balance, paymentStatus };
}
