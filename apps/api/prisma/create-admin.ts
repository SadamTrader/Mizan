/**
 * One-time admin user creation script.
 * Run with: pnpm --filter @scrap-erp/api create-admin -- --name "Admin" --email "admin@example.com" --password "yourpassword"
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const name = getArg('--name');
  const email = getArg('--email');
  const password = getArg('--password');

  if (!name || !email || !password) {
    console.error('Usage: pnpm --filter @scrap-erp/api create-admin -- --name "Admin" --email "admin@example.com" --password "yourpassword"');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`❌ A user with email "${email}" already exists`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'ADMIN' },
  });

  console.log(`✅ Admin user created:`);
  console.log(`   Name:  ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role:  ${user.role}`);
  console.log(`   ID:    ${user.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
