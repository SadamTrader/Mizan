import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { AppError } from '../../common/errors.js';
import { calculateCurrentStock, calculateWeightedAvgCost } from '../../common/stock.js';
import { calculatePartyBalance } from '../../common/ledger.js';
import type { CreateSaleInput } from '@scrap-erp/shared-types';

// ─── Number generation ────────────────────────────────────────────────────────

async function generateSaleNumber(prisma: PrismaClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SAL-${year}-`;

  const last = await prisma.sale.findFirst({
    where: { saleNumber: { startsWith: prefix } },
    orderBy: { saleNumber: 'desc' },
    select: { saleNumber: true },
  });

  let next = 1;
  if (last) {
    const seq = parseInt(last.saleNumber.replace(prefix, ''), 10);
    if (!isNaN(seq)) next = seq + 1;
  }

  return `${prefix}${String(next).padStart(5, '0')}`;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createSale(
  prisma: PrismaClient,
  data: CreateSaleInput,
  userId: string,
) {
  const saleNumber = await generateSaleNumber(prisma);
  const saleDate = new Date(data.saleDate);

  return prisma.$transaction(async (tx) => {
    // ── Stock validation — must happen BEFORE any writes ───────────────────
    // Check all items first so we fail fast with a clear error, not mid-write
    for (const item of data.items) {
      const currentStock = await calculateCurrentStock(item.itemId, data.warehouseId, tx);
      const requested = new Decimal(item.quantity);

      if (requested.greaterThan(currentStock)) {
        // Fetch item name for a clear error message
        const scrapItem = await tx.scrapItem.findUnique({
          where: { id: item.itemId },
          select: { name: true },
        });
        const itemName = scrapItem?.name ?? item.itemId;
        throw new AppError(
          422,
          `Insufficient stock for ${itemName}. Available: ${currentStock.toFixed(3)}, Requested: ${requested.toFixed(3)}`,
        );
      }
    }

    // ── Calculate amounts ──────────────────────────────────────────────────
    const processedItems = data.items.map((item) => {
      const quantity = new Decimal(item.quantity);
      const rate = new Decimal(item.rate);
      const amount = quantity.times(rate);
      return { ...item, quantity, rate, amount };
    });

    const grossAmount = processedItems.reduce(
      (sum, i) => sum.plus(i.amount),
      new Decimal(0),
    );

    const expenseAmount = new Decimal(data.expenseAmount ?? 0);

    // ARCHITECTURE DECISION: netAmount = grossAmount only.
    // expenseAmount is stored for profit reporting (Part 13) but is NOT added
    // to what the customer owes — sale expenses are an internal business cost,
    // not billed to the customer. Customer receivable = grossAmount.
    const netAmount = grossAmount;

    // ── Create Sale record ─────────────────────────────────────────────────
    const sale = await tx.sale.create({
      data: {
        saleNumber,
        partyId: data.partyId,
        warehouseId: data.warehouseId,
        saleDate,
        status: 'CONFIRMED',
        grossAmount: grossAmount.toDecimalPlaces(2).toString(),
        expenseAmount: expenseAmount.toDecimalPlaces(2).toString(),
        netAmount: netAmount.toDecimalPlaces(2).toString(),
        createdBy: userId,
      },
    });

    // ── Create SaleItems + StockMovements ──────────────────────────────────
    for (const item of processedItems) {
      // Calculate weighted average cost at time of sale (locked in permanently)
      const unitCost = await calculateWeightedAvgCost(item.itemId, data.warehouseId, tx);

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          itemId: item.itemId,
          quantity: item.quantity.toDecimalPlaces(3).toString(),
          rate: item.rate.toDecimalPlaces(2).toString(),
          amount: item.amount.toDecimalPlaces(2).toString(),
          unitCost: unitCost.toDecimalPlaces(4).toString(),
        },
      });

      // Stock check was already done above; re-read current stock for balanceAfter
      const currentStock = await calculateCurrentStock(item.itemId, data.warehouseId, tx);
      const balanceAfter = currentStock.minus(item.quantity);

      await tx.stockMovement.create({
        data: {
          warehouseId: data.warehouseId,
          itemId: item.itemId,
          movementType: 'SALE_OUT',
          referenceType: 'SALE',
          referenceId: sale.id,
          quantity: item.quantity.toDecimalPlaces(3).toString(),
          balanceAfter: balanceAfter.toDecimalPlaces(3).toString(),
          createdBy: userId,
        },
      });
    }

    // ── Create LedgerEntry ─────────────────────────────────────────────────
    // Sale → customer receivable increases → debit the party
    const currentBalance = await calculatePartyBalance(data.partyId, tx);
    const ledgerBalanceAfter = currentBalance.minus(netAmount); // debit reduces the balance (they owe us)

    await tx.ledgerEntry.create({
      data: {
        partyId: data.partyId,
        transactionType: 'SALE',
        referenceType: 'SALE',
        referenceId: sale.id,
        debit: netAmount.toDecimalPlaces(2).toString(),
        credit: new Prisma.Decimal(0),
        balanceAfter: ledgerBalanceAfter.toDecimalPlaces(2).toString(),
        entryDate: saleDate,
      },
    });

    // Return full sale with relations
    return tx.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: {
        items: { include: { item: true } },
        party: true,
        warehouse: true,
      },
    });
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────

export type ListSalesFilters = {
  search?: string;
  partyId?: string;
  warehouseId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export async function listSales(prisma: PrismaClient, filters: ListSalesFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Prisma.SaleWhereInput = {
    deletedAt: null,
    ...(filters.partyId && { partyId: filters.partyId }),
    ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
    ...(filters.status && { status: filters.status as 'CONFIRMED' | 'CANCELLED' | 'DRAFT' }),
    ...(filters.search && {
      saleNumber: { contains: filters.search, mode: 'insensitive' },
    }),
    ...((filters.from || filters.to) && {
      saleDate: {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { saleDate: 'desc' },
      include: { party: true, warehouse: true },
    }),
    prisma.sale.count({ where }),
  ]);

  return { items, total, page, pageSize: limit };
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getSaleById(prisma: PrismaClient, id: string) {
  const sale = await prisma.sale.findFirst({
    where: { id, deletedAt: null },
    include: {
      items: { include: { item: true } },
      party: true,
      warehouse: true,
    },
  });
  if (!sale) throw new AppError(404, 'Sale not found');
  return sale;
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelSale(prisma: PrismaClient, id: string, userId: string) {
  const sale = await getSaleById(prisma, id);

  if (sale.status !== 'CONFIRMED') {
    throw new AppError(422, 'Only confirmed sales can be cancelled');
  }

  return prisma.$transaction(async (tx) => {
    // ── Reversing StockMovements — return stock (ADJUSTMENT_IN) ───────────
    for (const item of sale.items) {
      const currentStock = await calculateCurrentStock(item.itemId, sale.warehouseId, tx);
      const quantity = new Decimal(item.quantity.toString());
      const balanceAfter = currentStock.plus(quantity); // stock goes back up

      await tx.stockMovement.create({
        data: {
          warehouseId: sale.warehouseId,
          itemId: item.itemId,
          movementType: 'ADJUSTMENT_IN',
          referenceType: 'SALE_CANCELLATION',
          referenceId: sale.id,
          quantity: quantity.toDecimalPlaces(3).toString(),
          balanceAfter: balanceAfter.toDecimalPlaces(3).toString(),
          createdBy: userId,
        },
      });
    }

    // ── Reversing LedgerEntry — cancel the receivable ─────────────────────
    const netAmount = new Decimal(sale.netAmount.toString());
    const currentBalance = await calculatePartyBalance(sale.partyId, tx);
    const ledgerBalanceAfter = currentBalance.plus(netAmount); // credit reverses the original debit

    await tx.ledgerEntry.create({
      data: {
        partyId: sale.partyId,
        transactionType: 'SALE',
        referenceType: 'SALE_CANCELLATION',
        referenceId: sale.id,
        debit: new Prisma.Decimal(0),
        credit: netAmount.toDecimalPlaces(2).toString(),
        balanceAfter: ledgerBalanceAfter.toDecimalPlaces(2).toString(),
        entryDate: new Date(),
      },
    });

    // ── Mark as CANCELLED ─────────────────────────────────────────────────
    return tx.sale.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        items: { include: { item: true } },
        party: true,
        warehouse: true,
      },
    });
  });
}

// ─── Profit Report ────────────────────────────────────────────────────────────

export type ProfitReportFilters = {
  from?: string;
  to?: string;
  partyId?: string;
  warehouseId?: string;
};

export async function getProfitReport(prisma: PrismaClient, filters: ProfitReportFilters) {
  const where: Prisma.SaleWhereInput = {
    status: 'CONFIRMED', // exclude cancelled sales from profit reports
    deletedAt: null,
    ...(filters.partyId && { partyId: filters.partyId }),
    ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
    ...((filters.from || filters.to) && {
      saleDate: {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      },
    }),
  };

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { saleDate: 'desc' },
    include: {
      party: { select: { name: true, partyCode: true } },
      warehouse: { select: { name: true } },
      items: true,
    },
  });

  const rows = sales.map((sale) => {
    const grossAmount = new Decimal(sale.grossAmount.toString());
    const expenseAmount = new Decimal(sale.expenseAmount.toString());

    // COGS = sum of (quantity × unitCost) for each SaleItem
    // unitCost may be null for pre-9c records — treat as 0
    const cogs = sale.items.reduce((sum: Decimal, item) => {
      const qty = new Decimal(item.quantity.toString());
      const cost = item.unitCost ? new Decimal(item.unitCost.toString()) : new Decimal(0);
      return sum.plus(qty.times(cost));
    }, new Decimal(0));

    const netProfit = grossAmount.minus(expenseAmount).minus(cogs);
    const margin =
      grossAmount.isZero() ? new Decimal(0) : netProfit.dividedBy(grossAmount).times(100);

    return {
      id: sale.id,
      saleNumber: sale.saleNumber,
      saleDate: sale.saleDate,
      partyName: (sale as { party?: { name: string } | null }).party?.name ?? null,
      warehouseName: (sale as { warehouse?: { name: string } | null }).warehouse?.name ?? null,      grossAmount: grossAmount.toDecimalPlaces(2).toString(),
      expenseAmount: expenseAmount.toDecimalPlaces(2).toString(),
      cogs: cogs.toDecimalPlaces(2).toString(),
      netProfit: netProfit.toDecimalPlaces(2).toString(),
      marginPct: margin.toDecimalPlaces(2).toString(),
    };
  });

  // Aggregate summary
  const totalRevenue = rows.reduce((s, r) => s.plus(r.grossAmount), new Decimal(0));
  const totalExpense = rows.reduce((s, r) => s.plus(r.expenseAmount), new Decimal(0));
  const totalCogs = rows.reduce((s, r) => s.plus(r.cogs), new Decimal(0));
  const totalProfit = rows.reduce((s, r) => s.plus(r.netProfit), new Decimal(0));
  const overallMargin = totalRevenue.isZero()
    ? new Decimal(0)
    : totalProfit.dividedBy(totalRevenue).times(100);

  return {
    rows,
    summary: {
      totalSales: rows.length,
      totalRevenue: totalRevenue.toDecimalPlaces(2).toString(),
      totalExpense: totalExpense.toDecimalPlaces(2).toString(),
      totalCogs: totalCogs.toDecimalPlaces(2).toString(),
      totalProfit: totalProfit.toDecimalPlaces(2).toString(),
      profitMarginPct: overallMargin.toDecimalPlaces(2).toString(),
    },
  };
}
