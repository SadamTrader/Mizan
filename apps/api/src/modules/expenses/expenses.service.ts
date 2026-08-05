import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { AppError } from '../../common/errors.js';
import type { CreateExpenseInput, UpdateExpenseInput } from '@scrap-erp/shared-types';

// ─── Number generation ────────────────────────────────────────────────────────

async function generateExpenseNumber(prisma: PrismaClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EXP-${year}-`;
  const last = await prisma.expense.findFirst({
    where: { expenseNumber: { startsWith: prefix } },
    orderBy: { expenseNumber: 'desc' },
    select: { expenseNumber: true },
  });
  let next = 1;
  if (last) {
    const seq = parseInt(last.expenseNumber.replace(prefix, ''), 10);
    if (!isNaN(seq)) next = seq + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createExpense(
  prisma: PrismaClient,
  data: CreateExpenseInput,
  userId: string,
) {
  const expenseNumber = await generateExpenseNumber(prisma);
  return prisma.expense.create({
    data: {
      expenseNumber,
      category: data.category,
      amount: new Decimal(data.amount).toDecimalPlaces(2).toString(),
      description: data.description,
      expenseDate: new Date(data.expenseDate),
      paymentMethod: data.paymentMethod,
      createdBy: userId,
    },
  });
  // NOTE: No LedgerEntry created — expenses are not tied to any party.
  // They are internal business cost records only.
}

// ─── List ─────────────────────────────────────────────────────────────────────

export type ListExpensesFilters = {
  search?: string;
  category?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export async function listExpenses(prisma: PrismaClient, filters: ListExpensesFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Prisma.ExpenseWhereInput = {
    ...(filters.category && { category: filters.category as never }),
    ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod as never }),
    ...(filters.search && {
      OR: [
        { expenseNumber: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ],
    }),
    ...((filters.from || filters.to) && {
      expenseDate: {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.expense.findMany({ where, skip, take: limit, orderBy: { expenseDate: 'desc' } }),
    prisma.expense.count({ where }),
  ]);

  return { items, total, page, pageSize: limit };
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getExpenseById(prisma: PrismaClient, id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new AppError(404, 'Expense not found');
  return expense;
}

// ─── Update (ADMIN only) ──────────────────────────────────────────────────────

export async function updateExpense(
  prisma: PrismaClient,
  id: string,
  data: UpdateExpenseInput,
) {
  await getExpenseById(prisma, id);
  return prisma.expense.update({
    where: { id },
    data: {
      ...(data.category !== undefined && { category: data.category }),
      ...(data.amount !== undefined && {
        amount: new Decimal(data.amount).toDecimalPlaces(2).toString(),
      }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.expenseDate !== undefined && { expenseDate: new Date(data.expenseDate) }),
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
    },
  });
}

// ─── Delete (ADMIN only — hard delete is safe, no counterparty impact) ────────

export async function deleteExpense(prisma: PrismaClient, id: string) {
  await getExpenseById(prisma, id);
  await prisma.expense.delete({ where: { id } });
}
