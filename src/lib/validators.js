import { z } from "zod";
import {
  AGENT_TXN_TYPES,
  ATTENDANCE_STATUSES,
  BOOKING_SOURCES,
  CHARGE_CATEGORIES,
  GUEST_TIERS,
  PAYMENT_METHODS,
  RESERVATION_STATUSES,
  ROOM_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "./constants";
import { ROLES } from "./permissions";

// Empty strings from HTML forms become null for optional fields.
const optionalText = (max = 2000) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), z.string().trim().max(max).nullable());

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date (YYYY-MM-DD)");
const optionalDate = z.preprocess((v) => (v === "" || v === undefined ? null : v), dateString.nullable());
const money = z.coerce.number().min(0, "must be zero or more").max(10_000_000);
const id = z.coerce.number().int().positive();
const optionalId = z.preprocess((v) => (v === "" || v === undefined || v === null ? null : v), id.nullable());

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("must be a valid email"),
  password: z.string().min(1, "is required"),
});

export const signupSchema = z.object({
  hotelName: z.string().trim().min(2, "is required").max(120),
  phone: optionalText(40),
  name: z.string().trim().min(2, "is required").max(120),
  email: z.string().trim().toLowerCase().email("must be a valid email"),
  password: z.string().min(8, "must be at least 8 characters").max(128),
});

export const roomTypeSchema = z.object({
  name: z.string().trim().min(1, "is required").max(100),
  description: optionalText(),
  baseRate: money,
  capacity: z.coerce.number().int().min(1).max(20),
  amenities: optionalText(),
});

export const roomSchema = z.object({
  number: z.string().trim().min(1, "is required").max(20),
  floor: z.coerce.number().int().min(-5).max(200),
  roomTypeId: id,
  status: z.enum(ROOM_STATUSES).optional(),
  notes: optionalText(),
});

export const roomStatusSchema = z.object({ status: z.enum(ROOM_STATUSES) });

export const guestSchema = z.object({
  firstName: z.string().trim().min(1, "is required").max(80),
  lastName: z.string().trim().min(1, "is required").max(80),
  email: z.preprocess(
    (v) => (v === "" || v === undefined ? null : typeof v === "string" ? v.trim().toLowerCase() : v),
    z.string().email("must be a valid email").nullable()
  ),
  phone: optionalText(40),
  nationality: optionalText(80),
  idType: optionalText(40),
  idNumber: optionalText(80),
  address: optionalText(),
  dateOfBirth: optionalDate,
  company: optionalText(120),
  // Optional without defaults (Prisma column defaults apply on create) so that
  // guestSchema.partial() never resets these on PATCH.
  tier: z.enum(GUEST_TIERS).optional(),
  vip: z.boolean().optional(),
  preferences: optionalText(),
  notes: optionalText(),
});

// No defaults here: the update schema is .partial(), and Zod 4 would apply
// defaults to omitted keys, silently overwriting stored values on PATCH.
const stayFields = {
  roomId: id,
  checkIn: dateString,
  checkOut: dateString,
  adults: z.coerce.number().int().min(1).max(20),
  children: z.coerce.number().int().min(0).max(20),
  source: z.enum(BOOKING_SOURCES),
  rate: money,
  discount: money,
  specialRequest: optionalText(),
  agentId: optionalId,
};

const checkDates = (data) => !data.checkIn || !data.checkOut || data.checkOut > data.checkIn;
const datesMessage = { message: "Check-out must be after check-in", path: ["checkOut"] };

export const reservationCreateSchema = z
  .object({
    ...stayFields,
    adults: stayFields.adults.default(1),
    children: stayFields.children.default(0),
    source: stayFields.source.default("WALK_IN"),
    rate: money.optional(),
    discount: money.default(0),
    guestId: optionalId,
    // Inline new guest, used when guestId is not provided.
    guest: guestSchema.partial().extend({ firstName: z.string().trim().min(1), lastName: z.string().trim().min(1) }).optional(),
    status: z.enum(["PENDING", "CONFIRMED"]).default("CONFIRMED"),
  })
  .refine(checkDates, datesMessage)
  .refine((d) => d.guestId || d.guest, { message: "Select a guest or enter new guest details", path: ["guestId"] });

// Used through readPartial(); date ordering is checked in the route and service.
export const reservationUpdateSchema = z.object({
  ...stayFields,
  status: z.enum(["PENDING", "CONFIRMED"]),
});

export const reservationStatusSchema = z.object({ status: z.enum(RESERVATION_STATUSES) });

export const chargeSchema = z.object({
  category: z.enum(CHARGE_CATEGORIES).default("OTHER"),
  description: z.string().trim().min(1, "is required").max(191),
  unitPrice: money.refine((v) => v > 0, "must be greater than zero"),
  quantity: z.coerce.number().int().min(1).max(1000).default(1),
});

export const paymentSchema = z.object({
  amount: money.refine((v) => v > 0, "must be greater than zero"),
  method: z.enum(PAYMENT_METHODS).default("CASH"),
  reference: optionalText(120),
});

export const taskSchema = z.object({
  roomId: id,
  title: z.string().trim().min(1, "is required").max(191),
  assignedToId: optionalId,
  // No defaults: taskSchema.partial() is used for PATCH (Prisma defaults apply on create).
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  notes: optionalText(),
  dueDate: optionalDate,
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "is required").max(120),
  email: z.string().trim().toLowerCase().email("must be a valid email"),
  password: z.string().min(8, "must be at least 8 characters"),
  role: z.enum(ROLES),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  password: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(8, "must be at least 8 characters").optional()),
});

export const hotelUpdateSchema = z.object({
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED"]).optional(),
  plan: z.string().trim().min(1).max(40).optional(),
  subscriptionEndsAt: optionalDate.optional(),
  extendDays: z.coerce.number().int().min(1).max(3660).optional(),
  notes: optionalText().optional(),
});

export const settingsSchema = z.object({
  hotelName: z.string().trim().min(1).max(120),
  address: z.string().trim().max(300).default(""),
  phone: z.string().trim().max(40).default(""),
  email: z.string().trim().max(191).default(""),
  currency: z.string().trim().length(3, "must be a 3-letter ISO code").toUpperCase(),
  taxRate: z.coerce.number().min(0).max(100),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/),
  pointsPerCurrencyUnit: z.coerce.number().min(0).max(100),
});

// ─── Housekeeping inspection ─────────────────────────────────────────────
export const inspectionSchema = z.object({
  result: z.enum(["PASSED", "FAILED"]),
  notes: optionalText(500),
});

// ─── Travel agents ───────────────────────────────────────────────────────
export const agentSchema = z.object({
  name: z.string().trim().min(1, "is required").max(120),
  contactPerson: optionalText(120),
  phone: optionalText(40),
  email: optionalText(191),
  commissionPct: z.coerce.number().min(0).max(100),
  openingBalance: z.coerce.number().min(-10_000_000).max(10_000_000),
  notes: optionalText(),
  active: z.boolean(),
});

export const agentTxnSchema = z.object({
  type: z.enum(AGENT_TXN_TYPES),
  amount: z.coerce.number().refine((v) => v !== 0, "must not be zero").refine((v) => Math.abs(v) <= 10_000_000, "is too large"),
  date: dateString,
  reference: optionalText(120),
  notes: optionalText(),
});

// ─── Purchases ───────────────────────────────────────────────────────────
export const supplierSchema = z.object({
  name: z.string().trim().min(1, "is required").max(120),
  phone: optionalText(40),
  email: optionalText(191),
  gstin: optionalText(30),
  address: optionalText(),
});

export const purchaseBillSchema = z.object({
  supplierId: id,
  billNo: z.string().trim().min(1, "is required").max(60),
  billDate: dateString,
  category: z.string().trim().min(1).max(60),
  taxAmount: money.default(0),
  notes: optionalText(),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, "is required").max(191),
        quantity: z.coerce.number().positive("must be more than zero").max(1_000_000),
        unit: optionalText(20),
        rate: money,
      })
    )
    .min(1, "add at least one item"),
  // Optional payment made at the same time as the bill.
  paidNow: money.default(0),
  method: z.enum(PAYMENT_METHODS).default("CASH"),
});

export const supplierPaymentSchema = z.object({
  supplierId: id,
  billId: optionalId,
  amount: money.refine((v) => v > 0, "must be greater than zero"),
  method: z.enum(PAYMENT_METHODS).default("CASH"),
  date: dateString,
  reference: optionalText(120),
});

// ─── Staff HR ────────────────────────────────────────────────────────────
export const employeeSchema = z.object({
  name: z.string().trim().min(1, "is required").max(120),
  designation: optionalText(80),
  department: z.string().trim().min(1).max(60),
  phone: optionalText(40),
  email: optionalText(191),
  address: optionalText(),
  idNumber: optionalText(60),
  bankAccount: optionalText(80),
  joinDate: optionalDate,
  monthlySalary: money,
  active: z.boolean(),
  notes: optionalText(),
});

export const attendanceSchema = z.object({
  date: dateString,
  records: z
    .array(
      z.object({
        employeeId: id,
        status: z.enum(ATTENDANCE_STATUSES).nullable(), // null clears the mark
        notes: optionalText(191),
      })
    )
    .max(1000),
});

export const salaryPaySchema = z.object({
  employeeId: id,
  month: z.string().regex(/^\d{4}-\d{2}$/, "must be YYYY-MM"),
  deductions: money.default(0),
  bonus: money.default(0),
  method: z.enum(PAYMENT_METHODS).default("BANK_TRANSFER"),
  paidOn: dateString,
  notes: optionalText(191),
});

// ─── Accounts ────────────────────────────────────────────────────────────
export const accountEntrySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  date: dateString,
  category: z.string().trim().min(1, "is required").max(60),
  description: z.string().trim().min(1, "is required").max(191),
  amount: money.refine((v) => v > 0, "must be greater than zero"),
  method: z.enum(PAYMENT_METHODS).default("CASH"),
  reference: optionalText(120),
});
