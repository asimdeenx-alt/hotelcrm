// Role-based access control. Each permission maps to the roles that hold it.

/** Roles a hotel admin can give to their own staff. SUPER_ADMIN is platform-only. */
export const ROLES = ["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING", "ACCOUNTANT"];

const PERMISSIONS = {
  // Platform owner
  platform: ["SUPER_ADMIN"],

  // Inside a hotel
  dashboard: ["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING", "ACCOUNTANT"],
  reservations: ["ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT"],
  "reservations.manage": ["ADMIN", "MANAGER", "RECEPTIONIST"],
  guests: ["ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT"],
  "guests.manage": ["ADMIN", "MANAGER", "RECEPTIONIST"],
  rooms: ["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"],
  "rooms.status": ["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"],
  "rooms.manage": ["ADMIN", "MANAGER"],
  housekeeping: ["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"],
  billing: ["ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT"],
  reports: ["ADMIN", "MANAGER", "ACCOUNTANT"],
  "housekeeping.inspect": ["ADMIN", "MANAGER", "HOUSEKEEPING"],
  invoices: ["ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT"],
  "reports.daily": ["ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT"],
  agents: ["ADMIN", "MANAGER", "ACCOUNTANT"],
  "agents.list": ["ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT"], // pick an agent when booking
  purchases: ["ADMIN", "MANAGER", "ACCOUNTANT"],
  accounts: ["ADMIN", "MANAGER", "ACCOUNTANT"],
  hr: ["ADMIN", "MANAGER"],
  attendance: ["ADMIN", "MANAGER"],
  salary: ["ADMIN", "MANAGER", "ACCOUNTANT"],
  staff: ["ADMIN"],
  settings: ["ADMIN", "MANAGER"],
  // Any signed-in hotel user (e.g. staff list for task assignment)
  hotel: ["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING", "ACCOUNTANT"],
};

/** @param {string | undefined} role @param {keyof typeof PERMISSIONS} permission */
export function can(role, permission) {
  return Boolean(role && PERMISSIONS[permission]?.includes(role));
}
