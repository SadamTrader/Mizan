import { PrismaClient } from '@prisma/client';
import { AppError } from '../../common/errors.js';
import { calculatePartyBalance } from '../../common/ledger.js';
import type { CreatePartyInput, UpdatePartyInput } from '@scrap-erp/shared-types';

// ─── Code generation ──────────────────────────────────────────────────────────

async function generatePartyCode(prisma: PrismaClient): Promise<string> {
  const last = await prisma.party.findFirst({
    where: { partyCode: { startsWith: 'PTY-' } },
    orderBy: { partyCode: 'desc' },
    select: { partyCode: true },
  });

  let next = 1;
  if (last) {
    const num = parseInt(last.partyCode.replace('PTY-', ''), 10);
    if (!isNaN(num)) next = num + 1;
  }

  return `PTY-${String(next).padStart(4, '0')}`;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export type ListPartiesFilters = {
  search?: string;
  isSupplier?: boolean;
  isCustomer?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
};

export async function listParties(prisma: PrismaClient, filters: ListPartiesFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(filters.isActive !== undefined ? { isActive: filters.isActive } : { isActive: true }),
    ...(filters.isSupplier !== undefined && { isSupplier: filters.isSupplier }),
    ...(filters.isCustomer !== undefined && { isCustomer: filters.isCustomer }),
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' as const } },
        { phone: { contains: filters.search, mode: 'insensitive' as const } },
        { partyCode: { contains: filters.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.party.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.party.count({ where }),
  ]);

  return { items, total, page, pageSize: limit };
}

// ─── Get by ID (with live balance) ───────────────────────────────────────────

export async function getPartyById(prisma: PrismaClient, id: string) {
  const party = await prisma.party.findFirst({
    where: { id, deletedAt: null },
  });
  if (!party) throw new AppError(404, 'Party not found');

  // Attach live calculated balance — closes the Part 8b gap
  const balance = await calculatePartyBalance(id, prisma as never);
  return { ...party, currentBalance: balance.toDecimalPlaces(2).toString() };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createParty(prisma: PrismaClient, data: CreatePartyInput) {
  const partyCode = await generatePartyCode(prisma);
  return prisma.party.create({
    data: {
      partyCode,
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      openingBalance: data.openingBalance ?? 0,
      isSupplier: data.isSupplier ?? false,
      isCustomer: data.isCustomer ?? false,
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateParty(prisma: PrismaClient, id: string, data: UpdatePartyInput) {
  await getPartyById(prisma, id); // throws 404 if not found

  return prisma.party.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.isSupplier !== undefined && { isSupplier: data.isSupplier }),
      ...(data.isCustomer !== undefined && { isCustomer: data.isCustomer }),
    },
  });
}

// ─── Deactivate (soft delete) ─────────────────────────────────────────────────

export async function deactivateParty(prisma: PrismaClient, id: string) {
  await getPartyById(prisma, id); // throws 404 if not found

  return prisma.party.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });
}

// ─── Live balance ─────────────────────────────────────────────────────────────

export async function getPartyBalance(prisma: PrismaClient, id: string) {
  await getPartyById(prisma, id); // throws 404 if not found
  const balance = await calculatePartyBalance(id, prisma as never);
  return { partyId: id, balance: balance.toDecimalPlaces(2).toString() };
}

// ─── Ledger statement ─────────────────────────────────────────────────────────

export type LedgerFilters = {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export async function getPartyLedger(
  prisma: PrismaClient,
  partyId: string,
  filters: LedgerFilters,
) {
  await getPartyById(prisma, partyId); // throws 404 if not found

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
  const skip = (page - 1) * limit;

  const dateFilter = {
    ...((filters.from || filters.to) && {
      entryDate: {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      },
    }),
  };

  // If date filter applied, calculate opening balance as of just before start date
  let openingBalance = '0';
  if (filters.from) {
    const beforeEntries = await prisma.ledgerEntry.aggregate({
      where: {
        partyId,
        entryDate: { lt: new Date(filters.from) },
      },
      _sum: { credit: true, debit: true },
    });

    const party = await prisma.party.findUnique({
      where: { id: partyId },
      select: { openingBalance: true },
    });

    const { Decimal } = await import('decimal.js');
    const ob = new Decimal(party?.openingBalance?.toString() ?? '0');
    const cr = new Decimal(beforeEntries._sum.credit?.toString() ?? '0');
    const db = new Decimal(beforeEntries._sum.debit?.toString() ?? '0');
    openingBalance = ob.plus(cr).minus(db).toDecimalPlaces(2).toString();
  } else {
    // No date filter — opening balance is just the party's openingBalance field
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      select: { openingBalance: true },
    });
    openingBalance = party?.openingBalance?.toString() ?? '0';
  }

  const [entries, total] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { partyId, ...dateFilter },
      orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.ledgerEntry.count({ where: { partyId, ...dateFilter } }),
  ]);

  return { openingBalance, entries, total, page, pageSize: limit };
}
