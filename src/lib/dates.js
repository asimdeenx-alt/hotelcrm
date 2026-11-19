// Stay dates are stored as MySQL DATE columns. We treat them as UTC midnight
// everywhere so a date never shifts by a day because of the server's timezone.

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-11-16" -> Date at 2026-11-16T00:00:00Z */
export function parseDateOnly(value) {
  if (value instanceof Date) return startOfDayUTC(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) throw new Error(`Invalid date: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function startOfDayUTC(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Today's calendar date in the hotel's local time, expressed as UTC midnight. */
export function todayDateOnly() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Today's local calendar date as "YYYY-MM-DD". */
export function localDateString(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns a valid "YYYY-MM-DD" from user input, or the fallback. */
export function safeDateParam(value, fallback = localDateString()) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

/**
 * Local-time [start, end) timestamps covering the given calendar days, for filtering
 * timestamp columns (payments, charges, check-in times) by the hotel's day.
 */
export function localDayRange(fromStr, toStr = fromStr) {
  const [y1, m1, d1] = fromStr.split("-").map(Number);
  const [y2, m2, d2] = toStr.split("-").map(Number);
  return { start: new Date(y1, m1 - 1, d1), end: new Date(y2, m2 - 1, d2 + 1) };
}

export function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * DAY_MS);
}

export function nightsBetween(checkIn, checkOut) {
  const diff = parseDateOnly(checkOut).getTime() - parseDateOnly(checkIn).getTime();
  return Math.max(0, Math.round(diff / DAY_MS));
}

/** Date -> "YYYY-MM-DD" (for <input type="date">) */
export function toDateInput(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

/** Pretty date for a DATE column, e.g. "16 Nov 2026". */
export function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(value)
  );
}

/** Pretty timestamp in local time, e.g. "16 Nov 2026, 14:05". */
export function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
