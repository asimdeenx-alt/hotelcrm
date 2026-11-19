// Locale per currency so amounts are grouped the local way (e.g. ₹1,25,000.00 for INR).
const CURRENCY_LOCALES = { INR: "en-IN", PKR: "en-PK", AED: "en-AE", GBP: "en-GB", EUR: "en-IE", USD: "en-US" };

export function formatMoney(value, currency = "INR") {
  const amount = Number(value ?? 0);
  const code = String(currency || "INR").toUpperCase();
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[code] ?? "en-IN", { style: "currency", currency: code }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/** "CHECKED_IN" -> "Checked in" */
export function humanize(value) {
  if (!value) return "";
  const text = String(value).toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function fullName(guest) {
  if (!guest) return "";
  return `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim();
}

export function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
