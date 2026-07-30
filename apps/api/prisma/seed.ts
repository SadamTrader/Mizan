import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding master data...');

  // ─── Warehouse ──────────────────────────────────────────────────────────────
  const warehouseExists = await prisma.warehouse.findFirst({
    where: { name: 'Main Yard' },
  });

  if (!warehouseExists) {
    await prisma.warehouse.create({
      data: { name: 'Main Yard' },
    });
    console.log('  ✓ Warehouse "Main Yard" created');
  } else {
    console.log('  – Warehouse "Main Yard" already exists, skipping');
  }

  // ─── Expense Types ───────────────────────────────────────────────────────────
  const defaultExpenseTypes = [
    'Transport',
    'Gas Cutting',
    'Labour',
    'Loading',
    'Sorting',
    'Miscellaneous',
  ];

  for (const name of defaultExpenseTypes) {
    await prisma.expenseType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`  ✓ ${defaultExpenseTypes.length} expense types seeded`);

  // ─── Settings ────────────────────────────────────────────────────────────────
  const defaultSettings = [
    { key: 'company_name', value: 'My Company' },
    { key: 'currency', value: 'USD' },
    { key: 'default_unit', value: 'KG' },
  ];

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: { key: setting.key, value: setting.value },
    });
  }
  console.log(`  ✓ ${defaultSettings.length} settings seeded`);

  console.log('✅ Seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
