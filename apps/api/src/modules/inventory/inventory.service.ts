import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { AppError } from '../../common/errors.js';
import { calculateCurrentStock } from '../../common/stock.js';

// ─── Current stock for a single item+warehouse ────────────────────────────────

export async function getCurrentStock(itemId: string, warehouseId: string, prisma: PrismaClient) {
  const stock = await calculateCurrentStock(itemId, warehouseId, prisma as never);
  return { itemId, warehouseId, stock: stock.toDecimalPlaces(3).toString() };
}

// ─── List all items with their current stock in a warehouse ───────────────────

export type ListStockFilters = {
  search?: string;
  page?: number;
  limit?: number;
};

export async function listStockByWarehouse(
  prisma: PrismaClient,
  warehouseId: string,
  filters: ListStockFilters,
) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  // Get all items that have ever had a movement in this warehouse
  const movedItemIds = await prisma.stockMovement.findMany({
    where: { warehouseId },
    select: { itemId: true },
    distinct: ['itemId'],
  });
  const itemIds = movedItemIds.map((m) => m.itemId);

  // Apply search filter on items
  const itemWhere = {
    id: { in: itemIds },
    deletedAt: null,
    isActive: true,
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' as const } },
        { itemCode: { contains: filters.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.scrapItem.findMany({
      where: itemWhere,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.scrapItem.count({ where: itemWhere }),
  ]);

  // Calculate stock for each item concurrently
  const stockRows = await Promise.all(
    items.map(async (item) => {
      const stock = await calculateCurrentStock(item.id, warehouseId, prisma as never);
      return {
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.name,
        unit: item.unit,
        category: item.category,
        stock: stock.toDecimalPlaces(3).toString(),
      };
    }),
  );

  return { items: stockRows, total, page, pageSize: limit, warehouseId };
}

// ─── Stock movement history for a specific item+warehouse ─────────────────────

export type MovementHistoryFilters = {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export async function getStockMovementHistory(
  prisma: PrismaClient,
  itemId: string,
  warehouseId: string,
  filters: MovementHistoryFilters,
) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where = {
    itemId,
    warehouseId,
    ...((filters.from || filters.to) && {
      createdAt: {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      },
    }),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        item: { select: { name: true, itemCode: true, unit: true } },
        warehouse: { select: { name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { items: movements, total, page, pageSize: limit };
}

// ─── Manual adjustment ────────────────────────────────────────────────────────

export type CreateAdjustmentInput = {
  itemId: string;
  warehouseId: string;
  quantity: number;   // positive = stock in, negative = stock out
  reason: string;
  adjustmentDate?: string;
};

export async function createManualAdjustment(
  prisma: PrismaClient,
  data: CreateAdjustmentInput,
  userId: string,
) {
  if (data.quantity === 0) {
    throw new AppError(422, 'Adjustment quantity cannot be zero');
  }

  return prisma.$transaction(async (tx) => {
    const qty = new Decimal(data.quantity);
    const currentStock = await calculateCurrentStock(data.itemId, data.warehouseId, tx);
    const balanceAfter = currentStock.plus(qty);

    // Guard: never allow stock to go negative
    if (balanceAfter.lessThan(0)) {
      throw new AppError(
        422,
        `Adjustment would result in negative stock. Current: ${currentStock.toFixed(3)}, Adjustment: ${qty.toFixed(3)}`,
      );
    }

    const movementType = qty.greaterThan(0) ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
    const absQty = qty.abs();

    const movement = await tx.stockMovement.create({
      data: {
        itemId: data.itemId,
        warehouseId: data.warehouseId,
        movementType,
        referenceType: 'MANUAL_ADJUSTMENT',
        referenceId: userId, // no separate adjustment table — userId identifies who made it
        quantity: absQty.toDecimalPlaces(3).toString(),
        balanceAfter: balanceAfter.toDecimalPlaces(3).toString(),
        notes: data.reason,
        createdBy: userId,
        // Store reason in a structured way via referenceId pattern isn't great here
        // — we use referenceType = "MANUAL_ADJUSTMENT:{reason}" for traceability
      },
    });

    // We can't store reason directly on StockMovement (no reason field in schema).
    // Return it in the response for confirmation; the referenceType identifies it as manual.
    return {
      ...movement,
      reason: data.reason,
      previousStock: currentStock.toDecimalPlaces(3).toString(),
    };
  });
}
