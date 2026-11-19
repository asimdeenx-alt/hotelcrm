import { round2 } from "./format";

/** "2026-11" → { start, end, days } using UTC dates (matches DATE columns). */
export function monthRange(month) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end, days: Math.round((end - start) / 86400000) };
}

export function currentMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function safeMonthParam(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "") ? value : currentMonth();
}

/**
 * Monthly salary from attendance. Unmarked days count as worked, so a hotel only has to
 * mark absences. Absent = no pay, half day = half pay; leave and holidays are paid.
 * @param {number|string} monthlySalary
 * @param {string} month "YYYY-MM"
 * @param {{ status: string }[]} records attendance rows for that employee and month
 */
export function computeSalary(monthlySalary, month, records = []) {
  const { days } = monthRange(month);
  const count = (s) => records.filter((r) => r.status === s).length;
  const absent = count("ABSENT");
  const halfDays = count("HALF_DAY");
  const leave = count("LEAVE");
  const holidays = count("HOLIDAY");
  const present = count("PRESENT");
  const payableDays = Math.max(0, days - absent - halfDays * 0.5);
  const perDay = Number(monthlySalary || 0) / days;
  return { days, present, absent, halfDays, leave, holidays, payableDays, perDay: round2(perDay), gross: round2(perDay * payableDays) };
}
