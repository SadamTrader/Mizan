import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { AppError } from '../../common/errors.js';
import { calculateCurrentStock, type TxClient } from '../../common/stock.js';
import { calculatePartyBalance } from '../../common/ledger.js';
import type { CreatePurchaseInput } from '@scrap-erp/shared-types';

// ─── Number generation ────────────────────────────────────────────────────────

async function generatePurchaseNumber(prisma: PrismaClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PUR-${year}-`;

  const last = await prisma.purchase.findFirst({
    where: { purchaseNumber: { startsWith: prefix } },
    orderBy: { purchaseNumber: 'desc' },
    select: { purchaseNumber: true },
  });

  let next = 1;
  if (last) {
    const seq = parseInt(last.purchaseNumber.replace(prefix, ''), 10);
    if (!isNaN(seq)) next = seq + 1;
  }

  return `${prefix}${String(next).padStart(5, '0')}`;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createPurchase(
  prisma: PrismaClient,
  data: CreatePurchaseInput,
  userId: string,
) {
  const purchaseNumber = await generatePurchaseNumber(prisma);
  const purchaseDate = new Date(data.purchaseDate);

  return prisma.$transaction(async (tx) => {
    // ── Calculate all item amounts ──────────────────────────────────────────
    const processedItems = data.items.map((item) => {
      const grossWeight = new Decimal(item.grossWeight);
      const cutWeight = new Decimal(item.cutWeight ?? 0);
      const netWeight = grossWeight.minus(cutWeight);
      const rate = new Decimal(item.rate);
      const amount = netWeight.times(rate);

      return { ...item, grossWeight, cutWeight, netWeight, rate, amount };
    });

    const grossAmount = processedItems.reduce(
      (sum, i) => sum.plus(i.amount),
      new Decimal(0),
    );
    const expenseAmount = new Decimal(data.expenseAmount ?? 0);
    const netAmount = grossAmount.plus(expenseAmount);

    // ── Create Purchase record ──────────────────────────────────────────────
    const purchase = await tx.purchase.create({
      data: {
        purchaseNumber,
        partyId: data.partyId,
        vehicleId: data.vehicleId ?? null,
        warehouseId: data.warehouseId,
        purchaseDate,
        status: 'CONFIRMED',
        grossAmount: grossAmount.toDecimalPlaces(2).toString(),
        expenseAmount: expenseAmount.toDecimalPlaces(2).toString(),
        netAmount: netAmount.toDecimalPlaces(2).toString(),
        createdBy: userId,
      },
    });

    // ── Create PurchaseItems + StockMovements ───────────────────────────────
    for (const item of processedItems) {
      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          itemId: item.itemId,
          grossWeight: item.grossWeight.toDecimalPlaces(3).toString(),
          cutWeight: item.cutWeight.toDecimalPlaces(3).toString(),
          netWeight: item.netWeight.toDecimalPlaces(3).toString(),
          rate: item.rate.toDecimalPlaces(2).toString(),
          amount: item.amount.toDecimalPlaces(2).toString(),
        },
      });

      const currentStock = await calculateCurrentStock(item.itemId, data.warehouseId, tx);
      const balanceAfter = currentStock.plus(item.netWeight);

      await tx.stockMovement.create({
        data: {
          warehouseId: data.warehouseId,
          itemId: item.itemId,
          movementType: 'PURCHASE_IN',
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          quantity: item.netWeight.toDecimalPlaces(3).toString(),
          balanceAfter: balanceAfter.toDecimalPlaces(3).toString(),
          createdBy: userId,
        },
      });
    }

    // ── Create LedgerEntry ──────────────────────────────────────────────────
    // Purchase → supplier payable increases → credit the party
    const currentBalance = await calculatePartyBalance(data.partyId, tx);
    const ledgerBalanceAfter = currentBalance.plus(netAmount);

    await tx.ledgerEntry.create({
      data: {
        partyId: data.partyId,
        transactionType: 'PURCHASE',
        referenceType: 'PURCHASE',
        referenceId: purchase.id,
        debit: new Prisma.Decimal(0),
        credit: netAmount.toDecimalPlaces(2).toString(),
        balanceAfter: ledgerBalanceAfter.toDecimalPlaces(2).toString(),
        entryDate: purchaseDate,
      },
    });

    // Return full purchase with relations
    return tx.purchase.findUniqueOrThrow({
      where: { id: purchase.id },
      include: {
        items: { include: { item: true } },
        party: true,
        vehicle: true,
        warehouse: true,
      },
    });
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────

export type ListPurchasesFilters = {
  search?: string;
  partyId?: string;
  warehouseId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export async function listPurchases(prisma: PrismaClient, filters: ListPurchasesFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Prisma.PurchaseWhereInput = {
    deletedAt: null,
    ...(filters.partyId && { partyId: filters.partyId }),
    ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
    ...(filters.status && { status: filters.status as 'CONFIRMED' | 'CANCELLED' | 'DRAFT' }),
    ...(filters.search && {
      purchaseNumber: { contains: filters.search, mode: 'insensitive' },
    }),
    ...((filters.from || filters.to) && {
      purchaseDate: {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { purchaseDate: 'desc' },
      include: { party: true, warehouse: true, vehicle: true },
    }),
    prisma.purchase.count({ where }),
  ]);

  return { items, total, page, pageSize: limit };
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getPurchaseById(prisma: PrismaClient, id: string) {
  const purchase = await prisma.purchase.findFirst({
    where: { id, deletedAt: null },
    include: {
      items: { include: { item: true } },
      party: true,
      vehicle: true,
      warehouse: true,
    },
  });
  if (!purchase) throw new AppError(404, 'Purchase not found');
  return purchase;
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelPurchase(prisma: PrismaClient, id: string, userId: string) {
  const purchase = await getPurchaseById(prisma, id);

  if (purchase.status !== 'CONFIRMED') {
    throw new AppError(422, 'Only confirmed purchases can be cancelled');
  }

  return prisma.$transaction(async (tx) => {
    // ── Reversing StockMovements (one per item) ─────────────────────────────
    for (const item of purchase.items) {
      const currentStock = await calculateCurrentStock(
        item.itemId,
        purchase.warehouseId,
        tx,
      );
      const netWeight = new Decimal(item.netWeight.toString());
      const balanceAfter = currentStock.minus(netWeight);

      await tx.stockMovement.create({
        data: {
          warehouseId: purchase.warehouseId,
          itemId: item.itemId,
          movementType: 'ADJUSTMENT_OUT',
          referenceType: 'PURCHASE_CANCELLATION',
          referenceId: purchase.id,
          quantity: netWeight.toDecimalPlaces(3).toString(),
          balanceAfter: balanceAfter.toDecimalPlaces(3).toString(),
          createdBy: userId,
        },
      });
    }

    // ── Reversing LedgerEntry ───────────────────────────────────────────────
    const netAmount = new Decimal(purchase.netAmount.toString());
    const currentBalance = await calculatePartyBalance(purchase.partyId, tx);
    const ledgerBalanceAfter = currentBalance.minus(netAmount);

    await tx.ledgerEntry.create({
      data: {
        partyId: purchase.partyId,
        transactionType: 'PURCHASE',
        referenceType: 'PURCHASE_CANCELLATION',
        referenceId: purchase.id,
        debit: netAmount.toDecimalPlaces(2).toString(),
        credit: new Prisma.Decimal(0),
        balanceAfter: ledgerBalanceAfter.toDecimalPlaces(2).toString(),
        entryDate: new Date(),
      },
    });

    // ── Mark as CANCELLED ───────────────────────────────────────────────────
    return tx.purchase.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        items: { include: { item: true } },
        party: true,
        vehicle: true,
        warehouse: true,
      },
    });
  });
}
