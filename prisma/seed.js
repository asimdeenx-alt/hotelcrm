// Demo data for the multi-hotel CRM. Run with: npm run db:seed
// WARNING: clears ALL existing data (every hotel) before inserting.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DAY = 86400000;
const PASSWORD = "Password123!";

function today() {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}
const day = (offset) => new Date(today().getTime() + offset * DAY);

let seed = 42;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
let codeN = 1000;

/**
 * Creates one hotel with staff, rooms, guests, reservations, folios and housekeeping tasks.
 * @param {{ name: string, emailDomain: string, status: string, plan: string, endsInDays: number,
 *   types: object[], layout: [number, number[]][], people: any[], pastStays: number, upcoming: number,
 *   staff: [string, string, string][], taxRate: string, currency: string }} cfg
 */
async function seedHotel(cfg, passwordHash) {
  const hotel = await prisma.hotel.create({
    data: {
      name: cfg.name,
      email: `owner@${cfg.emailDomain}`,
      phone: "+1 555 0100",
      status: cfg.status,
      plan: cfg.plan,
      subscriptionEndsAt: new Date(Date.now() + cfg.endsInDays * DAY),
    },
  });
  const hotelId = hotel.id;
  await prisma.setting.createMany({
    data: [
      ["address", cfg.address],
      ["phone", "+1 555 0100"],
      ["email", `frontdesk@${cfg.emailDomain}`],
      ["currency", cfg.currency],
      ["taxRate", cfg.taxRate],
    ].map(([key, value]) => ({ hotelId, key, value })),
  });

  const users = {};
  for (const [name, local, role] of cfg.staff) {
    users[role] = await prisma.user.create({
      data: { hotelId, name, email: `${local}@${cfg.emailDomain}`, role, passwordHash },
    });
  }

  const types = [];
  for (const t of cfg.types) types.push(await prisma.roomType.create({ data: { ...t, hotelId } }));

  const rooms = [];
  for (const [floor, typeIdx] of cfg.layout) {
    for (let i = 0; i < typeIdx.length; i++) {
      rooms.push(
        await prisma.room.create({
          data: { hotelId, number: `${floor}${String(i + 1).padStart(2, "0")}`, floor, roomTypeId: types[typeIdx[i]].id },
        })
      );
    }
  }
  const maintenanceRoom = rooms[Math.min(5, rooms.length - 1)];
  await prisma.room.update({ where: { id: maintenanceRoom.id }, data: { status: "MAINTENANCE", notes: "Bathroom regrouting" } });

  const nationalities = ["British", "American", "Italian", "Czech", "Lebanese", "Brazilian", "Japanese", "French", "Pakistani", "Irish"];
  const prefs = ["Feather-free pillows", "High floor, away from lift", "Vegetarian breakfast", "Late check-out when possible", "Sparkling water in room", null];
  const guests = [];
  for (const [firstName, lastName, tier, vip, company] of cfg.people) {
    guests.push(
      await prisma.guest.create({
        data: {
          hotelId,
          firstName,
          lastName,
          tier,
          vip,
          company: company ?? null,
          email: `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, "") + "@example.com",
          phone: `+1 555 ${String(int(1000, 9999))}`,
          nationality: pick(nationalities),
          preferences: pick(prefs),
          loyaltyPoints: tier === "PLATINUM" ? 18400 : tier === "GOLD" ? 7200 : tier === "SILVER" ? 2100 : int(0, 600),
        },
      })
    );
  }

  const sources = ["WALK_IN", "PHONE", "EMAIL", "WEBSITE", "OTA", "OTA", "WEBSITE", "CORPORATE"];
  const sellable = rooms.filter((r) => r.id !== maintenanceRoom.id);
  const bookings = [];
  const overlaps = (roomId, a, b) => bookings.some(([r, s, e]) => r === roomId && s < b && e > a);
  const taxMultiplier = 1 + Number(cfg.taxRate) / 100;
  const frontDesk = users.RECEPTIONIST ?? users.ADMIN;

  async function book({ room, guest, start, nights, status }) {
    const checkIn = day(start);
    const checkOut = day(start + nights);
    if (overlaps(room.id, checkIn, checkOut)) return null;
    bookings.push([room.id, checkIn, checkOut]);
    const type = types.find((t) => t.id === room.roomTypeId);
    const rate = Math.round(Number(type.baseRate) * (rand() < 0.3 ? 0.9 : 1));
    const r = await prisma.reservation.create({
      data: {
        hotelId,
        code: `HM-${(codeN++).toString(36).toUpperCase().padStart(6, "0")}`,
        guestId: guest.id,
        roomId: room.id,
        checkIn,
        checkOut,
        adults: Math.min(type.capacity, int(1, 2)),
        status,
        source: pick(sources),
        rate,
        createdById: frontDesk.id,
        actualCheckIn: ["CHECKED_IN", "CHECKED_OUT"].includes(status) ? new Date(checkIn.getTime() + 15 * 3600000) : null,
        actualCheckOut: status === "CHECKED_OUT" ? new Date(checkOut.getTime() + 10 * 3600000) : null,
        createdAt: new Date(checkIn.getTime() - int(3, 40) * DAY),
      },
    });

    const roomTotal = nights * rate;
    let extras = 0;
    if (["CHECKED_IN", "CHECKED_OUT"].includes(status)) {
      const items = [
        ["FOOD_BEVERAGE", "In-room dining", 38],
        ["MINIBAR", "Minibar", 14],
        ["SPA", "Signature massage", 120],
        ["LAUNDRY", "Pressing service", 22],
        ["FOOD_BEVERAGE", "Restaurant", 56],
      ];
      for (let i = 0; i < int(0, 3); i++) {
        const [category, description, price] = pick(items);
        const quantity = int(1, 2);
        extras += price * quantity;
        await prisma.charge.create({
          data: { reservationId: r.id, category, description, unitPrice: price, quantity, createdAt: new Date(checkIn.getTime() + DAY) },
        });
      }
    }
    const total = Math.round((roomTotal + extras) * taxMultiplier * 100) / 100;
    if (status === "CHECKED_OUT") {
      await prisma.payment.create({
        data: {
          reservationId: r.id,
          amount: rand() < 0.08 ? Math.round(total * 0.5) : total,
          method: pick(["CARD", "CARD", "CASH", "BANK_TRANSFER", "ONLINE"]),
          receivedById: frontDesk.id,
          createdAt: r.actualCheckOut,
        },
      });
    } else if (status === "CHECKED_IN" && rand() < 0.6) {
      await prisma.payment.create({
        data: { reservationId: r.id, amount: Math.round(roomTotal * 0.5), method: "CARD", reference: "Deposit", receivedById: frontDesk.id, createdAt: r.actualCheckIn },
      });
    } else if (status === "CONFIRMED" && rand() < 0.35) {
      await prisma.payment.create({
        data: { reservationId: r.id, amount: Math.round(roomTotal * 0.3), method: "ONLINE", reference: "Advance deposit", receivedById: frontDesk.id, createdAt: r.createdAt },
      });
    }
    return r;
  }

  for (let i = 0; i < cfg.pastStays; i++) {
    const start = -int(3, 330);
    const nights = int(1, 5);
    if (start + nights > 0) continue;
    await book({ room: pick(sellable), guest: pick(guests), start, nights, status: rand() < 0.06 ? "CANCELLED" : "CHECKED_OUT" });
  }
  for (const room of sellable.filter(() => rand() < 0.55)) {
    const start = -int(0, 3);
    const r = await book({ room, guest: pick(guests), start, nights: Math.max(int(1, 4) - start, 1), status: "CHECKED_IN" });
    if (r) await prisma.room.update({ where: { id: room.id }, data: { status: "OCCUPIED" } });
  }
  for (let i = 0; i < cfg.upcoming; i++) {
    const start = rand() < 0.15 ? 0 : int(1, 45);
    await book({ room: pick(sellable), guest: pick(guests), start, nights: int(1, 6), status: rand() < 0.2 ? "PENDING" : "CONFIRMED" });
  }

  const free = await prisma.room.findMany({ where: { hotelId, status: "AVAILABLE" }, take: 3 });
  for (const room of free) {
    await prisma.room.update({ where: { id: room.id }, data: { status: "CLEANING" } });
    await prisma.housekeepingTask.create({
      data: { hotelId, roomId: room.id, title: `Departure clean — room ${room.number}`, priority: "HIGH", dueDate: today(), assignedToId: users.HOUSEKEEPING?.id ?? null },
    });
  }
  await prisma.housekeepingTask.create({
    data: { hotelId, roomId: maintenanceRoom.id, title: "Regrout shower and reseal", priority: "NORMAL", status: "IN_PROGRESS", notes: "Contractor booked 10:00" },
  });

  console.log(`  ${cfg.name}: ${rooms.length} rooms, ${guests.length} guests, ${bookings.length} reservations`);
  return hotel;
}

async function main() {
  console.log("Clearing existing data…");
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.charge.deleteMany(),
    prisma.housekeepingTask.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.guest.deleteMany(),
    prisma.room.deleteMany(),
    prisma.roomType.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.user.deleteMany(),
    prisma.hotel.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log("Creating platform owner…");
  await prisma.user.create({
    data: { name: "Platform Owner", email: "superadmin@hotelcrm.test", role: "SUPER_ADMIN", passwordHash, hotelId: null },
  });

  console.log("Creating hotels…");
  await seedHotel(
    {
      name: "The Grand Meridian",
      emailDomain: "grandmeridian.test",
      address: "1 Harbour Boulevard",
      status: "ACTIVE",
      plan: "Yearly",
      endsInDays: 300,
      currency: "USD",
      taxRate: "10",
      staff: [
        ["Amelia Hart", "admin", "ADMIN"],
        ["Daniel Okafor", "manager", "MANAGER"],
        ["Sofia Marin", "frontdesk", "RECEPTIONIST"],
        ["Ravi Mehta", "housekeeping", "HOUSEKEEPING"],
        ["Lena Fischer", "accounts", "ACCOUNTANT"],
      ],
      types: [
        { name: "Classic Queen", baseRate: 145, capacity: 2, amenities: "Queen bed, City view, Rain shower, Smart TV", description: "A calm, well-proportioned room for one or two." },
        { name: "Deluxe King", baseRate: 210, capacity: 2, amenities: "King bed, Harbour view, Nespresso, Bathtub", description: "Generous space with harbour views and a deep soaking tub." },
        { name: "Family Twin", baseRate: 245, capacity: 4, amenities: "Two double beds, Sofa bed, Kids amenities", description: "Room for the whole family, with a sofa bed." },
        { name: "Junior Suite", baseRate: 360, capacity: 3, amenities: "King bed, Lounge, Balcony, Club access", description: "Separate lounge area, balcony and club lounge access." },
        { name: "Meridian Suite", baseRate: 690, capacity: 4, amenities: "Two bedrooms, Dining room, Butler service, Terrace", description: "Our signature suite with private terrace and butler." },
      ],
      layout: [
        [1, [0, 0, 0, 0, 2, 2]],
        [2, [0, 0, 1, 1, 1, 2]],
        [3, [1, 1, 1, 1, 3, 3]],
        [4, [1, 1, 3, 3, 4]],
      ],
      people: [
        ["Olivia", "Bennett", "GOLD", true, "Acme Corp"],
        ["Noah", "Kim", "REGULAR", false],
        ["Emma", "Rossi", "SILVER", false],
        ["Liam", "Novak", "REGULAR", false],
        ["Ava", "Haddad", "PLATINUM", true, "Haddad Holdings"],
        ["Ethan", "Silva", "REGULAR", false],
        ["Mia", "Tanaka", "SILVER", false],
        ["Lucas", "Dubois", "REGULAR", false],
        ["Zara", "Ahmed", "GOLD", false],
        ["James", "O'Connor", "REGULAR", false],
        ["Chloe", "Larsen", "REGULAR", false],
        ["Omar", "Farouk", "SILVER", false, "Gulf Logistics"],
        ["Isabella", "Moreau", "REGULAR", false],
        ["Henry", "Walsh", "GOLD", true],
        ["Aisha", "Khan", "REGULAR", false],
        ["Mateo", "García", "REGULAR", false],
      ],
      pastStays: 260,
      upcoming: 70,
    },
    passwordHash
  );

  await seedHotel(
    {
      name: "Seaside Inn",
      emailDomain: "seasideinn.test",
      address: "22 Beach Road",
      status: "TRIAL",
      plan: "Trial",
      endsInDays: 9,
      currency: "PKR",
      taxRate: "16",
      staff: [
        ["Bilal Raza", "admin", "ADMIN"],
        ["Hina Shah", "frontdesk", "RECEPTIONIST"],
      ],
      types: [
        { name: "Standard Double", baseRate: 9500, capacity: 2, amenities: "Double bed, AC, Wi-Fi" },
        { name: "Sea View Deluxe", baseRate: 15000, capacity: 3, amenities: "King bed, Sea view, Balcony" },
      ],
      layout: [
        [1, [0, 0, 0, 0]],
        [2, [1, 1, 1, 0]],
      ],
      people: [
        ["Ahmed", "Ali", "REGULAR", false],
        ["Sara", "Iqbal", "SILVER", true],
        ["Usman", "Tariq", "REGULAR", false],
        ["Fatima", "Noor", "GOLD", false],
        ["Hamza", "Qureshi", "REGULAR", false],
      ],
      pastStays: 60,
      upcoming: 12,
    },
    passwordHash
  );

  console.log("\nSeed complete. All passwords:", PASSWORD);
  console.log("  Platform owner (Super Admin): superadmin@hotelcrm.test");
  console.log("  The Grand Meridian admin:     admin@grandmeridian.test  (also manager@, frontdesk@, housekeeping@, accounts@)");
  console.log("  Seaside Inn admin:            admin@seasideinn.test     (also frontdesk@)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
