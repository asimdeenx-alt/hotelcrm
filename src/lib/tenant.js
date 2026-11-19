import "server-only";
import { prisma } from "./prisma";

// Models that carry a hotelId column directly.
const HOTEL_MODELS = new Set([
  "User",
  "RoomType",
  "Room",
  "Guest",
  "Reservation",
  "HousekeepingTask",
  "Setting",
  "RoomInspection",
  "TravelAgent",
  "AgentTransaction",
  "Supplier",
  "PurchaseBill",
  "SupplierPayment",
  "Employee",
  "Attendance",
  "SalaryPayment",
  "AccountEntry",
]);
// PurchaseItem is only ever created nested inside its PurchaseBill and read through it.
// Models that belong to a hotel through their reservation.
const RESERVATION_MODELS = new Set(["Charge", "Payment"]);

const WHERE_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
  "upsert",
]);

const clients = new Map();

/**
 * Returns a Prisma client locked to one hotel. Every query on a hotel-owned model gets
 * `hotelId` added to its filter, and every create gets `hotelId` set — so code using this
 * client can never read or change another hotel's data, even by mistake.
 * @param {number} hotelId
 */
export function forHotel(hotelId) {
  if (!Number.isInteger(hotelId) || hotelId <= 0) throw new Error("forHotel() requires a hotel id");
  if (clients.has(hotelId)) return clients.get(hotelId);

  const client = prisma.$extends({
    name: `hotel-${hotelId}`,
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const a = { ...(args ?? {}) };

          if (HOTEL_MODELS.has(model)) {
            if (WHERE_OPERATIONS.has(operation)) a.where = { ...a.where, hotelId };
            if (operation === "create") a.data = { ...a.data, hotelId };
            if (operation === "createMany" || operation === "createManyAndReturn") {
              a.data = [].concat(a.data).map((row) => ({ ...row, hotelId }));
            }
            if (operation === "upsert") a.create = { ...a.create, hotelId };
          } else if (RESERVATION_MODELS.has(model) && WHERE_OPERATIONS.has(operation)) {
            a.where = { ...a.where, reservation: { ...(a.where?.reservation ?? {}), hotelId } };
          }
          // Creates of Charge/Payment are only done after loading their reservation through this client.

          return query(a);
        },
      },
    },
  });

  clients.set(hotelId, client);
  return client;
}
