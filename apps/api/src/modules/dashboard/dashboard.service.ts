import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { calculatePartyBalance } from '../../common/ledger.js';

// ─── Shared date helpers ──────────────────────────────────────────────────────

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

function parseDateRange(from?: string, to?: string) {
  if (from || to) {
    return {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
  }
  return currentMonthRange();
}

// ─── Dashboard Summary ────────────────────────────────────────────────────────

export type DashboardSummaryFilters = { from?: string; to?: string };

export async function getDashboardSummary(
  prisma: PrismaClient,
  filters: DashboardSummaryFilters,
) {
  const { from, to } = parseDateRange(filters.from, filters.to);
  const dateFilter = { gte: from, lte: to };

  // Run all aggregations concurrently — single round of DB calls
  const [
    purchasesAgg,
    salesAgg,
    supplierPayAgg,
    customerPayAgg,
    expensesAgg,
    salesForProfit,
    allParties,
  ] = await Promise.all([
    // Total purchases
    prisma.purchase.aggregate({
      where: { status: 'CONFIRMED', deletedAt: null, purchaseDate: dateFilter },
      _count: true,
      _sum: { grossAmount: true },
    }),
    // Total sales
    prisma.sale.aggregate({
      where: { status: 'CONFIRMED', deletedAt: null, saleDate: dateFilter },
      _count: true,
      _sum: { grossAmount: true },
    }),
    // Supplier payments
    prisma.payment.aggregate({
      where: { paymentType: 'SUPPLIER_PAYMENT', paymentDate: dateFilter },
      _count: true,
      _sum: { amount: true },
    }),
    // Customer payments
    prisma.payment.aggregate({
      where: { paymentType: 'CUSTOMER_PAYMENT', paymentDate: dateFilter },
      _count: true,
      _sum: { amount: true },
    }),
    // Expenses
    prisma.expense.aggregate({
      where: { expenseDate: dateFilter },
      _sum: { amount: true },
    }),
    // Sales with items for COGS calculation (needed for netProfit)
    prisma.sale.findMany({
      where: { status: 'CONFIRMED', deletedAt: null, saleDate: dateFilter },
      select: { grossAmount: true, expenseAmount: true, items: { select: { quantity: true, unitCost: true } } },
    }),
    // All active parties for receivables/payables
    prisma.party.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    }),
  ]);

  // Net profit = sum of per-sale (grossAmount - expenseAmount - COGS) minus period expenses
  const totalExpenses = new Decimal(expensesAgg._sum.amount?.toString() ?? '0');

  const salesNetProfit = salesForProfit.reduce((sum, sale) => {
    const gross = new Decimal(sale.grossAmount.toString());
    const exp = new Decimal(sale.expenseAmount.toString());
    const cogs = sale.items.reduce((acc, item) => {
      const qty = new Decimal(item.quantity.toString());
      const cost = item.unitCost ? new Decimal(item.unitCost.toString()) : new Decimal(0);
      return acc.plus(qty.times(cost));
    }, new Decimal(0));
    return sum.plus(gross.minus(exp).minus(cogs));
  }, new Decimal(0));

  const netProfit = salesNetProfit.minus(totalExpenses);

  // Outstanding receivables/payables — calculate each party's live balance
  // Uses calculatePartyBalance for correctness; acceptable since party count is small
  let outstandingReceivables = new Decimal(0); // customers owe us (negative balance)
  let outstandingPayables = new Decimal(0);    // we owe suppliers (positive balance)

  for (const party of allParties) {
    const bal = await calculatePartyBalance(party.id, prisma as never);
    if (bal.greaterThan(0)) {
      outstandingPayables = outstandingPayables.plus(bal);    // we owe them
    } else if (bal.lessThan(0)) {
      outstandingReceivables = outstandingReceivables.plus(bal.abs()); // they owe us
    }
  }

  return {
    period: { from: from?.toISOString(), to: to?.toISOString() },
    purchases: {
      count: purchasesAgg._count,
      total: new Decimal(purchasesAgg._sum.grossAmount?.toString() ?? '0').toDecimalPlaces(2).toString(),
    },
    sales: {
      count: salesAgg._count,
      total: new Decimal(salesAgg._sum.grossAmount?.toString() ?? '0').toDecimalPlaces(2).toString(),
    },
    payments: {
      supplier: {
        count: supplierPayAgg._count,
        total: new Decimal(supplierPayAgg._sum.amount?.toString() ?? '0').toDecimalPlaces(2).toString(),
      },
      customer: {
        count: customerPayAgg._count,
        total: new Decimal(customerPayAgg._sum.amount?.toString() ?? '0').toDecimalPlaces(2).toString(),
      },
    },
    expenses: {
      total: totalExpenses.toDecimalPlaces(2).toString(),
    },
    netProfit: netProfit.toDecimalPlaces(2).toString(),
    outstandingReceivables: outstandingReceivables.toDecimalPlaces(2).toString(),
    outstandingPayables: outstandingPayables.toDecimalPlaces(2).toString(),
    // lowStockItems: SKIPPED — ScrapItem has no minStock/reorderLevel field.
    // Add a migration to add minStock to ScrapItem if this metric is needed.
  };
}

// ─── Sales Trend ──────────────────────────────────────────────────────────────

export type TrendFilters = { from?: string; to?: string; groupBy?: 'day' | 'week' | 'month' };

export async function getSalesTrend(prisma: PrismaClient, filters: TrendFilters) {
  const { from, to } = parseDateRange(filters.from, filters.to);
  const groupBy = filters.groupBy ?? 'day';

  const sales = await prisma.sale.findMany({
    where: { status: 'CONFIRMED', deletedAt: null, saleDate: { gte: from, lte: to } },
    select: { saleDate: true, grossAmount: true },
    orderBy: { saleDate: 'asc' },
  });

  return groupByPeriod(sales, 'saleDate', 'grossAmount', groupBy);
}

// ─── Purchases Trend ──────────────────────────────────────────────────────────

export async function getPurchasesTrend(prisma: PrismaClient, filters: TrendFilters) {
  const { from, to } = parseDateRange(filters.from, filters.to);
  const groupBy = filters.groupBy ?? 'day';

  const purchases = await prisma.purchase.findMany({
    where: { status: 'CONFIRMED', deletedAt: null, purchaseDate: { gte: from, lte: to } },
    select: { purchaseDate: true, grossAmount: true },
    orderBy: { purchaseDate: 'asc' },
  });

  return groupByPeriod(purchases, 'purchaseDate', 'grossAmount', groupBy);
}

// ─── Period grouping helper ───────────────────────────────────────────────────

function getPeriodKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
  if (groupBy === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  if (groupBy === 'week') {
    // ISO week: Monday-based
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    return d.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function groupByPeriod<T extends Record<string, unknown>>(
  rows: T[],
  dateField: keyof T,
  amountField: keyof T,
  groupBy: 'day' | 'week' | 'month',
) {
  const buckets = new Map<string, { period: string; count: number; total: Decimal }>();

  for (const row of rows) {
    const date = row[dateField] as Date;
    const amount = new Decimal((row[amountField] as { toString(): string }).toString());
    const key = getPeriodKey(date, groupBy);

    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.total = existing.total.plus(amount);
    } else {
      buckets.set(key, { period: key, count: 1, total: amount });
    }
  }

  return Array.from(buckets.values()).map((b) => ({
    period: b.period,
    count: b.count,
    total: b.total.toDecimalPlaces(2).toString(),
  }));
}

// ─── Top Items ────────────────────────────────────────────────────────────────
// Ranked by total sale REVENUE (grossAmount) — more useful than quantity alone
// since items have different rates and weights

export type TopItemsFilters = { from?: string; to?: string; limit?: number };

export async function getTopItems(prisma: PrismaClient, filters: TopItemsFilters) {
  const { from, to } = parseDateRange(filters.from, filters.to);
  const limit = Math.min(50, filters.limit ?? 10);

  // Use Prisma groupBy on saleItems joined to their parent sale date
  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: { status: 'CONFIRMED', deletedAt: null, saleDate: { gte: from, lte: to } },
    },
    select: {
      itemId: true,
      quantity: true,
      amount: true,
      item: { select: { name: true, itemCode: true, unit: true } },
    },
  });

  // Aggregate by itemId in memory (saleItems per period is manageable)
  const map = new Map<string, { itemId: string; name: string; itemCode: string; unit: string; totalQty: Decimal; totalRevenue: Decimal }>();

  for (const si of saleItems) {
    const existing = map.get(si.itemId);
    const qty = new Decimal(si.quantity.toString());
    const rev = new Decimal(si.amount.toString());
    if (existing) {
      existing.totalQty = existing.totalQty.plus(qty);
      existing.totalRevenue = existing.totalRevenue.plus(rev);
    } else {
      map.set(si.itemId, {
        itemId: si.itemId,
        name: si.item?.name ?? si.itemId,
        itemCode: si.item?.itemCode ?? '',
        unit: si.item?.unit ?? '',
        totalQty: qty,
        totalRevenue: rev,
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.totalRevenue.comparedTo(a.totalRevenue))
    .slice(0, limit)
    .map((r) => ({
      itemId: r.itemId,
      name: r.name,
      itemCode: r.itemCode,
      unit: r.unit,
      totalQuantity: r.totalQty.toDecimalPlaces(3).toString(),
      totalRevenue: r.totalRevenue.toDecimalPlaces(2).toString(),
    }));
}

// ─── Top Parties ──────────────────────────────────────────────────────────────

export type TopPartiesFilters = { from?: string; to?: string; limit?: number; type?: 'customer' | 'supplier' };

export async function getTopParties(prisma: PrismaClient, filters: TopPartiesFilters) {
  const { from, to } = parseDateRange(filters.from, filters.to);
  const limit = Math.min(50, filters.limit ?? 10);
  const type = filters.type ?? 'customer';

  if (type === 'customer') {
    const sales = await prisma.sale.findMany({
      where: { status: 'CONFIRMED', deletedAt: null, saleDate: { gte: from, lte: to } },
      select: { partyId: true, grossAmount: true, party: { select: { name: true, partyCode: true } } },
    });

    const map = new Map<string, { partyId: string; name: string; partyCode: string; total: Decimal; count: number }>();
    for (const s of sales) {
      const ex = map.get(s.partyId);
      const amt = new Decimal(s.grossAmount.toString());
      if (ex) { ex.total = ex.total.plus(amt); ex.count++; }
      else map.set(s.partyId, { partyId: s.partyId, name: s.party?.name ?? '', partyCode: s.party?.partyCode ?? '', total: amt, count: 1 });
    }
    return Array.from(map.values())
      .sort((a, b) => b.total.comparedTo(a.total))
      .slice(0, limit)
      .map((r) => ({ ...r, total: r.total.toDecimalPlaces(2).toString() }));
  } else {
    const purchases = await prisma.purchase.findMany({
      where: { status: 'CONFIRMED', deletedAt: null, purchaseDate: { gte: from, lte: to } },
      select: { partyId: true, grossAmount: true, party: { select: { name: true, partyCode: true } } },
    });

    const map = new Map<string, { partyId: string; name: string; partyCode: string; total: Decimal; count: number }>();
    for (const pu of purchases) {
      const ex = map.get(pu.partyId);
      const amt = new Decimal(pu.grossAmount.toString());
      if (ex) { ex.total = ex.total.plus(amt); ex.count++; }
      else map.set(pu.partyId, { partyId: pu.partyId, name: pu.party?.name ?? '', partyCode: pu.party?.partyCode ?? '', total: amt, count: 1 });
    }
    return Array.from(map.values())
      .sort((a, b) => b.total.comparedTo(a.total))
      .slice(0, limit)
      .map((r) => ({ ...r, total: r.total.toDecimalPlaces(2).toString() }));
  }
}
