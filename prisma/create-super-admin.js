// Creates (or resets the password of) the platform owner account. No hotels are created.
// Usage: npm run super-admin -- <email> [password] [name]
// If no password is given, a strong random one is generated and printed once.
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [emailArg, passwordArg, ...nameParts] = process.argv.slice(2);
  const email = (emailArg || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Usage: npm run super-admin -- <email> [password] [name]");
    process.exit(1);
  }
  const password = passwordArg || crypto.randomBytes(9).toString("base64url");
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }
  const name = nameParts.join(" ") || "Platform Owner";
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== "SUPER_ADMIN") {
    console.error(`${email} already belongs to a hotel account. Use a different email.`);
    process.exit(1);
  }
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, active: true },
    create: { email, name, passwordHash, role: "SUPER_ADMIN", hotelId: null },
  });

  console.log(`\nSuper Admin ready.\n  Email:    ${email}\n  Password: ${password}\n  Sign in at /login — you will land on the Hotels panel (/platform).\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
