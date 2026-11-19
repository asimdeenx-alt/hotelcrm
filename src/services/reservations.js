import "server-only";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { BLOCKING_STATUSES } from "@/lib/constants";
import { parseDateOnly, todayDateOnly } from "@/lib/dates";
import { computeFolio } from "@/lib/folio";
import { getSettings } from "@/lib/settings";

export const reservationInclude = {
  guest: true,
  room: { include: { roomType: true } },
  charges: { orderBy: { createdAt: "asc" } },
  payments: { orderBy: { createdAt: "asc" }, include: { receivedBy: { select: { id: true, name: true } } } },
  createdBy: { select: { id: true, name: true } },
  agent: { select: { id: true, name: true } },
};

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `HM-${code}`;
}

/** Throws 409 if the room is already booked for any night in [checkIn, checkOut). */
export async function assertRoomAvailable(db, { roomId, checkIn, checkOut, excludeReservationId }) {
  const conflict = await db.reservation.findFirst({
    where: {
      roomId,
      status: { in: BLOCKING_STATUSES },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: { code: true },
  });
  if (conflict) throw new ApiError(409, `Room is already booked for these dates (reservation ${conflict.code}).`);
}

/** Rooms with no overlapping booking that are not blocked for maintenance. */
export async function findAvailableRooms(db, { checkIn, checkOut, guests = 1 }) {
  const start = parseDateOnly(checkIn);
  const end = parseDateOnly(checkOut);
  return db.room.findMany({
    where: {
      status: { notIn: ["MAINTENANCE", "OUT_OF_ORDER"] },
      roomType: { capacity: { gte: guests } },
      reservations: {
        none: { status: { in: BLOCKING_STATUSES }, checkIn: { lt: end }, checkOut: { gt: start } },
      },
    },
    include: { roomType: true },
    orderBy: [{ floor: "asc" }, { number: "asc" }],
  });
}

export async function createReservation(db, input, session) {
  const checkIn = parseDateOnly(input.checkIn);
  const checkOut = parseDateOnly(input.checkOut);

  return db.$transaction(async (tx) => {
    const room = await tx.room.findUnique({ where: { id: input.roomId }, include: { roomType: true } });
    if (!room) throw new ApiError(404, "Room not found.");
    if (["MAINTENANCE", "OUT_OF_ORDER"].includes(room.status)) {
      throw new ApiError(409, `Room ${room.number} is ${room.status.toLowerCase().replace(/_/g, " ")}.`);
    }
    if (input.adults + input.children > room.roomType.capacity) {
      throw new ApiError(422, `Room ${room.number} sleeps at most ${room.roomType.capacity} guests.`);
    }
    await assertRoomAvailable(tx, { roomId: room.id, checkIn, checkOut });

    let guestId = input.guestId;
    if (!guestId) {
      const g = input.guest;
      const guest = await tx.guest.create({
        data: {
          firstName: g.firstName,
          lastName: g.lastName,
          email: g.email ?? null,
          phone: g.phone ?? null,
          nationality: g.nationality ?? null,
        },
      });
      guestId = guest.id;
    } else if (!(await tx.guest.findUnique({ where: { id: guestId }, select: { id: true } }))) {
      throw new ApiError(404, "Guest not found.");
    }

    if (input.agentId && !(await tx.travelAgent.findUnique({ where: { id: input.agentId }, select: { id: true } }))) {
      throw new ApiError(404, "Travel agent not found.");
    }

    // Retry on the (very unlikely) chance of a code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      // Codes are unique across all hotels, so check with the unscoped client.
      const exists = await prisma.reservation.findUnique({ where: { code }, select: { id: true } });
      if (exists) continue;
      return tx.reservation.create({
        data: {
          code,
          guestId,
          roomId: room.id,
          checkIn,
          checkOut,
          adults: input.adults,
          children: input.children,
          source: input.source,
          status: input.status,
          rate: input.rate ?? room.roomType.baseRate,
          discount: input.discount ?? 0,
          specialRequest: input.specialRequest ?? null,
          agentId: input.agentId ?? null,
          createdById: session.id,
        },
        include: reservationInclude,
      });
    }
    throw new ApiError(500, "Could not generate a reservation code.");
  });
}

export async function updateReservation(db, id, input) {
  return db.$transaction(async (tx) => {
    const current = await tx.reservation.findUnique({ where: { id }, include: { room: { include: { roomType: true } } } });
    if (!current) throw new ApiError(404, "Reservation not found.");
    if (!["PENDING", "CONFIRMED", "CHECKED_IN"].includes(current.status)) {
      throw new ApiError(409, "Only upcoming or in-house reservations can be edited.");
    }

    const roomId = input.roomId ?? current.roomId;
    const checkIn = input.checkIn ? parseDateOnly(input.checkIn) : current.checkIn;
    const checkOut = input.checkOut ? parseDateOnly(input.checkOut) : current.checkOut;
    if (checkOut <= checkIn) throw new ApiError(422, "Check-out must be after check-in.");
    await assertRoomAvailable(tx, { roomId, checkIn, checkOut, excludeReservationId: id });
    if (input.agentId && !(await tx.travelAgent.findUnique({ where: { id: input.agentId }, select: { id: true } }))) {
      throw new ApiError(404, "Travel agent not found.");
    }

    if (roomId !== current.roomId) {
      const newRoom = await tx.room.findUnique({ where: { id: roomId }, include: { roomType: true } });
      if (!newRoom) throw new ApiError(404, "Room not found.");
      const guests = (input.adults ?? current.adults) + (input.children ?? current.children);
      if (guests > newRoom.roomType.capacity) {
        throw new ApiError(422, `Room ${newRoom.number} sleeps at most ${newRoom.roomType.capacity} guests.`);
      }
      // In-house room move: the new room must be ready; the old room goes to cleaning.
      if (current.status === "CHECKED_IN") {
        if (newRoom.status !== "AVAILABLE") throw new ApiError(409, `Room ${newRoom.number} is not available for a move.`);
        await tx.room.update({ where: { id: current.roomId }, data: { status: "CLEANING" } });
        await tx.room.update({ where: { id: roomId }, data: { status: "OCCUPIED" } });
      }
    }

    return tx.reservation.update({
      where: { id },
      data: {
        roomId,
        checkIn,
        checkOut,
        adults: input.adults,
        children: input.children,
        source: input.source,
        rate: input.rate,
        discount: input.discount,
        specialRequest: input.specialRequest,
        agentId: input.agentId,
        // Only upcoming bookings can toggle between pending and confirmed.
        status: current.status === "CHECKED_IN" ? undefined : input.status,
      },
      include: reservationInclude,
    });
  });
}

export async function checkIn(db, id) {
  return db.$transaction(async (tx) => {
    const r = await tx.reservation.findUnique({ where: { id }, include: { room: true } });
    if (!r) throw new ApiError(404, "Reservation not found.");
    if (!["PENDING", "CONFIRMED"].includes(r.status)) throw new ApiError(409, `Cannot check in a ${r.status} reservation.`);
    if (r.checkIn > todayDateOnly()) throw new ApiError(409, "Check-in date has not arrived yet. Edit the dates first.");
    if (r.room.status !== "AVAILABLE") {
      throw new ApiError(409, `Room ${r.room.number} is ${r.room.status.toLowerCase().replace(/_/g, " ")} — it must be available.`);
    }
    await tx.room.update({ where: { id: r.roomId }, data: { status: "OCCUPIED" } });
    return tx.reservation.update({
      where: { id },
      data: { status: "CHECKED_IN", actualCheckIn: new Date() },
      include: reservationInclude,
    });
  });
}

/**
 * Checks a guest out. Requires a settled folio unless `force` is set (managers only).
 * Marks the room for cleaning, creates a housekeeping task and awards loyalty points.
 */
export async function checkOut(db, hotelId, id, { force = false } = {}) {
  const settings = await getSettings(hotelId);
  return db.$transaction(async (tx) => {
    const r = await tx.reservation.findUnique({ where: { id }, include: { charges: true, payments: true, room: true } });
    if (!r) throw new ApiError(404, "Reservation not found.");
    if (r.status !== "CHECKED_IN") throw new ApiError(409, "Only checked-in guests can be checked out.");

    const folio = computeFolio(r, settings.taxRate);
    if (folio.balance > 0.009 && !force) {
      throw new ApiError(409, `Outstanding balance of ${folio.balance.toFixed(2)} must be settled before check-out.`);
    }

    await tx.room.update({ where: { id: r.roomId }, data: { status: "CLEANING" } });
    await tx.housekeepingTask.create({
      data: { roomId: r.roomId, title: `Departure clean — room ${r.room.number}`, priority: "HIGH", dueDate: todayDateOnly() },
    });
    const points = Math.floor(folio.paid * Number(settings.pointsPerCurrencyUnit || 0));
    if (points > 0) {
      await tx.guest.update({ where: { id: r.guestId }, data: { loyaltyPoints: { increment: points } } });
    }
    return tx.reservation.update({
      where: { id },
      data: { status: "CHECKED_OUT", actualCheckOut: new Date() },
      include: reservationInclude,
    });
  });
}

export async function cancelReservation(db, id, status = "CANCELLED") {
  const r = await db.reservation.findUnique({ where: { id } });
  if (!r) throw new ApiError(404, "Reservation not found.");
  if (!["PENDING", "CONFIRMED"].includes(r.status)) {
    throw new ApiError(409, "Only upcoming reservations can be cancelled or marked no-show.");
  }
  return db.reservation.update({ where: { id }, data: { status }, include: reservationInclude });
}

/** Adds the folio summary to a reservation using its hotel's current tax rate. */
export async function withFolio(reservation) {
  const settings = await getSettings(reservation.hotelId);
  return { ...reservation, folio: computeFolio(reservation, settings.taxRate) };
}
