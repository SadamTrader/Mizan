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
