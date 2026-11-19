# Premium Hotel CRM

A hotel management CRM built with **Next.js 16 (App Router) + React 19 + JavaScript**, **Tailwind CSS v4**, **shadcn/ui**, and **Prisma ORM on MySQL 8**.

> **JavaScript only.** This project uses `.js` / `.jsx` files exclusively — no TypeScript, no `tsconfig.json`, no `.ts`/`.tsx` files. Path aliases live in `jsconfig.json`; shadcn/ui is configured with `"tsx": false`; Prisma uses the `prisma-client-js` generator.

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** | Occupancy, arrivals/departures due, cash collected, 14-day occupancy forecast, room status summary |
| **Reservations** | Availability search, booking with existing or new guest, edit dates/room/rate, room moves, check-in, check-out, cancel, no-show |
| **Folio & billing** | Room charges + extras (F&B, spa, minibar…), discounts, tax, payments, balance; printable invoice; check-out blocked on open balance (manager override) |
| **Guests** | CRM profiles, VIP flag, tiers, preferences, ID details, stay history, lifetime spend, loyalty points (awarded on check-out) |
| **Rooms** | Live board by floor, status changes, room & room-type management |
| **Housekeeping** | Task board (to do / in progress / done), assignments, priorities; departure cleans auto-created on check-out; room auto-released when its last task is done |
| **Reports** | 12-month revenue, occupancy, ADR, RevPAR, room-type performance, booking sources |
| **Staff & roles** | Admin, Manager, Receptionist, Housekeeping, Accountant — role-based navigation and API permissions |
| **Settings** | Hotel details, currency, tax rate, check-in/out times, loyalty earn rate |

## Getting started

Requirements: Node.js 20+ and a MySQL 8 server.

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Configure the database and session secret
cp .env.example .env        # then edit DATABASE_URL and AUTH_SECRET

# 3. Create the database tables
npm run db:push             # or: npm run db:migrate  (creates a migration)

# 4. Create the platform owner (Super Admin) account — prints a password if you omit one
npm run super-admin -- you@example.com

# 5. Start the app
npm run dev
```

Optional: `npm run db:seed-demo` loads two demo hotels (**wipes all data**).

## Multi-hotel (SaaS) model

- **Hotels register themselves** at `/signup` ("Register your hotel"). This creates the hotel on a 14-day free trial and its owner as the hotel **Admin**.
- **Every hotel's data is private.** Rooms, guests, reservations, folios, housekeeping, staff and settings all carry `hotelId`; `forHotel(hotelId)` in `src/lib/tenant.js` adds it to every query automatically, so one hotel can never read or change another's data.
- **Hotel admins add their own staff** (Staff → Add staff) and choose each person's role.
- **Super Admin** (`/platform`) sees every hotel with owner and usage, and can activate (1 month / 1 year), extend trials, set a custom expiry, add notes, or suspend. Suspended or expired hotels are locked out immediately and see `/suspended`; their data is kept.
- To change the Super Admin email or reset its password, run `npm run super-admin -- <email> [password]` again.

## Project structure

```
prisma/
  schema.prisma          MySQL data model
  seed.js                Demo data
src/
  proxy.js               Redirects signed-out visitors to /login (Next 16 "proxy", formerly middleware)
  app/
    (auth)/login/        Sign-in page
    (crm)/               Authenticated pages (Server Components) — dashboard, reservations, guests, rooms…
    api/                 Route Handlers (route.js) — the JSON backend
  components/
    ui/                  shadcn/ui components (.jsx)
    layout/ shared/ …    App shell and feature components
  hooks/use-api.js       Client fetch helper with toasts + router refresh
  lib/                   prisma, auth/session, permissions, validators (zod), dates, folio maths, settings
  services/              Reservation business logic (availability, check-in/out, room moves)
```

### Conventions

- **Reads** happen in Server Components straight through Prisma; **writes** go through Route Handlers in `src/app/api`, wrapped by `route(permission, handler)` in `src/lib/api.js` for auth, role checks and consistent error JSON.
- Stay dates are MySQL `DATE` columns handled as UTC midnight (`src/lib/dates.js`) so they never drift by a day.
- Money is stored as `DECIMAL(10,2)`; folio totals are computed in one place (`src/lib/folio.js`).

## API overview

All endpoints require a signed-in session cookie except `POST /api/auth/login`.

```
POST   /api/auth/login | /api/auth/logout      GET /api/auth/me
GET    /api/availability?checkIn=&checkOut=&guests=
GET    /api/reservations        POST /api/reservations
GET    /api/reservations/:id    PATCH /api/reservations/:id
POST   /api/reservations/:id/check-in | check-out | cancel
POST   /api/reservations/:id/charges     DELETE /api/reservations/:id/charges/:chargeId
POST   /api/reservations/:id/payments
GET|POST /api/guests            GET|PATCH|DELETE /api/guests/:id
GET|POST /api/rooms             PATCH|DELETE /api/rooms/:id
GET|POST /api/room-types        PATCH|DELETE /api/room-types/:id
GET|POST /api/housekeeping      PATCH|DELETE /api/housekeeping/:id
GET|POST /api/users             PATCH /api/users/:id
GET|PUT  /api/settings
```
