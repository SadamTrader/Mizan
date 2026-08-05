import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

// Prisma transaction client type — shared across all modules
export type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Returns the current stock for an item in a warehouse.
 * Stock = sum of IN movements (PURCHASE_IN, ADJUSTMENT_IN)
 *       minus OUT movements (SALE_OUT, ADJUSTMENT_OUT).
 *
 * Always calculated from StockMovement records — never stored directly on any entity.
 * MUST be called with the transaction client (tx) when inside a $transaction.
 */
export async function calculateCurrentStock(
  itemId: string,
  warehouseId: string,
  tx: TxClient,
): Promise<Decimal> {
  const movements = await tx.stockMovement.findMany({
    where: { itemId, warehouseId },
    select: { movementType: true, quantity: true },
  });

  return movements.reduce((acc, m) => {
    const qty = new Decimal(m.quantity.toString());
    if (m.movementType === 'PURCHASE_IN' || m.movementType === 'ADJUSTMENT_IN') {
      return acc.plus(qty);
    }
    return acc.minus(qty);
  }, new Decimal(0));
}

/**
 * Returns the weighted average purchase cost per unit for an item in a warehouse.
 *
 * Method: (total purchase value still in stock) / (total quantity in stock)
 * Uses PURCHASE_IN StockMovements matched against their PurchaseItem rates.
 *
 * Edge cases:
 * - No stock at all → returns Decimal(0) — caller must handle the "selling from zero" case
 * - Only adjustment movements (no purchase origin) → returns Decimal(0)
 *
 * MUST be called with the transaction client (tx) when inside a $transaction.
 */
export async function calculateWeightedAvgCost(
  itemId: string,
  warehouseId: string,
  tx: TxClient,
): Promise<Decimal> {
  // Get all PURCHASE_IN movements for this item+warehouse with their referenceId
  const purchaseMovements = await tx.stockMovement.findMany({
    where: { itemId, warehouseId, movementType: 'PURCHASE_IN' },
    select: { referenceId: true, quantity: true },
    orderBy: { createdAt: 'asc' },
  });

  if (purchaseMovements.length === 0) return new Decimal(0);

  // Get all SALE_OUT movements to know how much has left
  const saleMovements = await tx.stockMovement.findMany({
    where: { itemId, warehouseId, movementType: 'SALE_OUT' },
    select: { quantity: true },
  });

  const totalSoldOut = saleMovements.reduce(
    (acc, m) => acc.plus(new Decimal(m.quantity.toString())),
    new Decimal(0),
  );

  // Total purchased
  const totalPurchased = purchaseMovements.reduce(
    (acc, m) => acc.plus(new Decimal(m.quantity.toString())),
    new Decimal(0),
  );

  // Remaining in stock
  const remaining = totalPurchased.minus(totalSoldOut);
  if (remaining.lessThanOrEqualTo(0)) return new Decimal(0);

  // Fetch purchase rates for each unique purchase referenceId
  const purchaseIds = [...new Set(purchaseMovements.map((m) => m.referenceId))];
  const purchaseItems = await tx.purchaseItem.findMany({
    where: { purchaseId: { in: purchaseIds }, itemId },
    select: { purchaseId: true, netWeight: true, rate: true },
  });

  // Build a map: purchaseId → rate
  const rateMap = new Map(
    purchaseItems.map((pi) => [pi.purchaseId, new Decimal(pi.rate.toString())]),
  );

  // Weighted sum = sum of (movement quantity × purchase rate)
  let totalValue = new Decimal(0);
  for (const m of purchaseMovements) {
    const qty = new Decimal(m.quantity.toString());
    const rate = rateMap.get(m.referenceId) ?? new Decimal(0);
    totalValue = totalValue.plus(qty.times(rate));
  }

  // Weighted average cost = total value / total purchased quantity
  // (We use total purchased not remaining, since weighted avg is across all purchases)
  if (totalPurchased.isZero()) return new Decimal(0);
  return totalValue.dividedBy(totalPurchased);
}
