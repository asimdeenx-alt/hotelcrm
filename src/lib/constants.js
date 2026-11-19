// Option lists and badge tones shared by server and client components.

/** Product name shown on the sign-in and registration pages. Set NEXT_PUBLIC_APP_NAME to rebrand. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Hotel CRM";

export const ROOM_STATUSES = ["AVAILABLE", "OCCUPIED", "CLEANING", "INSPECTION", "MAINTENANCE", "OUT_OF_ORDER"];
export const RESERVATION_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"];
export const BOOKING_SOURCES = ["WALK_IN", "PHONE", "EMAIL", "WEBSITE", "OTA", "CORPORATE"];
export const CHARGE_CATEGORIES = ["FOOD_BEVERAGE", "SPA", "LAUNDRY", "MINIBAR", "TRANSPORT", "OTHER"];
export const PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "ONLINE"];
export const GUEST_TIERS = ["REGULAR", "SILVER", "GOLD", "PLATINUM"];
export const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "DONE"];
export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
export const AGENT_TXN_TYPES = ["INVOICE", "PAYMENT", "COMMISSION", "ADJUSTMENT"];
export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "HOLIDAY"];
export const PURCHASE_CATEGORIES = ["Kitchen", "Bar", "Housekeeping", "Laundry", "Maintenance", "Linen", "Office", "Other"];
export const EXPENSE_CATEGORIES = ["Electricity", "Water", "Gas / Fuel", "Rent", "Repairs", "Marketing", "Internet / Phone", "Taxes & Fees", "Commission", "Miscellaneous"];
export const INCOME_CATEGORIES = ["Restaurant (walk-in)", "Banquet / Events", "Parking", "Laundry (outside)", "Rental", "Miscellaneous"];
export const DEPARTMENTS = ["Front Office", "Housekeeping", "Kitchen", "Restaurant", "Maintenance", "Security", "Accounts", "Management"];

/** Reservation statuses that occupy a room for their date range. */
export const BLOCKING_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN"];

// Tone names map to classes in <StatusBadge />.
export const STATUS_TONES = {
  AVAILABLE: "success",
  OCCUPIED: "info",
  CLEANING: "warning",
  INSPECTION: "violet",
  MAINTENANCE: "danger",

  PASSED: "success",
  FAILED: "danger",

  PRESENT: "success",
  ABSENT: "danger",
  HALF_DAY: "warning",
  LEAVE: "info",
  HOLIDAY: "muted",

  INVOICE: "warning",
  PAYMENT: "success",
  COMMISSION: "info",
  ADJUSTMENT: "muted",

  INCOME: "success",
  EXPENSE: "danger",
  OUT_OF_ORDER: "muted",

  PENDING: "warning",
  CONFIRMED: "info",
  CHECKED_IN: "success",
  CHECKED_OUT: "muted",
  CANCELLED: "danger",
  NO_SHOW: "danger",

  IN_PROGRESS: "info",
  DONE: "success",

  LOW: "muted",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "danger",

  REGULAR: "muted",
  SILVER: "info",
  GOLD: "gold",
  PLATINUM: "gold",

  PAID: "success",
  PARTIAL: "warning",
  UNPAID: "danger",
};

export const DEFAULT_SETTINGS = {
  hotelName: "The Grand Meridian",
  address: "1 Harbour Boulevard",
  phone: "+1 555 0100",
  email: "frontdesk@example.com",
  currency: "INR",
  taxRate: "10", // percent applied to room + extras
  checkInTime: "14:00",
  checkOutTime: "11:00",
  pointsPerCurrencyUnit: "1", // loyalty points earned per 1 unit paid on checkout
};
