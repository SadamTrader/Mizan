import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { AppError } from '../../common/errors.js';
import { calculatePartyBalance } from '../../common/ledger.js';
import type { CreatePaymentInput } from '@scrap-erp/shared-types';

// ─── Number generation ────────────────────────────────────────────────────────

async function generatePaymentNumber(prisma: PrismaClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;

  const last = await prisma.payment.findFirst({
    where: { paymentNumber: { startsWith: prefix } },
    orderBy: { paymentNumber: 'desc' },
    select: { paymentNumber: true },
  });

  let next = 1;
  if (last) {
    const seq = parseInt(last.paymentNumber.replace(prefix, ''), 10);
    if (!isNaN(seq)) next = seq + 1;
  }

  return `${prefix}${String(next).padStart(5, '0')}`;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createPayment(
  prisma: PrismaClient,
  data: CreatePaymentInput,
  userId: string,
) {
  const party = await prisma.party.findFirst({
    where: { id: data.partyId, deletedAt: null },
  });
  if (!party) throw new AppError(404, 'Party not found');

  // Validate payment direction matches party type
  if (data.paymentType === 'SUPPLIER_PAYMENT' && !party.isSupplier) {
    throw new AppError(422, 'This party is not marked as a supplier');
  }
  if (data.paymentType === 'CUSTOMER_PAYMENT' && !party.isCustomer) {
    throw new AppError(422, 'This party is not marked as a customer');
  }

  const paymentNumber = await generatePaymentNumber(prisma);
  const paymentDate = new Date(data.paymentDate);
  const amount = new Decimal(data.amount);

  return prisma.$transaction(async (tx) => {
    // Create Payment record
    const payment = await tx.payment.create({
      data: {
        paymentNumber,
        partyId: data.partyId,
        paymentType: data.paymentType,
        amount: amount.toDecimalPlaces(2).toString(),
        method: data.method,
        referenceNumber: data.referenceNumber ?? null,
        paymentDate,
        remarks: data.remarks ?? null,
        createdBy: userId,
      },
    });

    // ── Create LedgerEntry — direction is critical ────────────────────────
    // Purchases CREDIT the party (we owe them more) → payment must DEBIT (reduce what we owe)
    // Sales DEBIT the party (they owe us more) → payment must CREDIT (reduce what they owe)
    //
    // SUPPLIER_PAYMENT: paying our supplier → debit (reduces supplier payable / credit balance)
    // CUSTOMER_PAYMENT: receiving from customer → credit (reduces customer receivable / debit balance)

    const currentBalance = await calculatePartyBalance(data.partyId, tx);

    let debit = new Decimal(0);
    let credit = new Decimal(0);
    let balanceAfter: Decimal;

    if (data.paymentType === 'SUPPLIER_PAYMENT') {
      debit = amount;
      balanceAfter = currentBalance.minus(amount); // reduces what we owe supplier
    } else {
      credit = amount;
      balanceAfter = currentBalance.plus(amount); // reduces what customer owes us (moves balance toward 0)
    }

    await tx.ledgerEntry.create({
      data: {
        partyId: data.partyId,
        transactionType: 'PAYMENT',
        referenceType: 'PAYMENT',
        referenceId: payment.id,
        debit: debit.toDecimalPlaces(2).toString(),
        credit: credit.toDecimalPlaces(2).toString(),
        balanceAfter: balanceAfter.toDecimalPlaces(2).toString(),
        entryDate: paymentDate,
      },
    });

    return tx.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { party: true },
    });
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────

export type ListPaymentsFilters = {
  search?: string;
  partyId?: string;
  paymentType?: string;
  method?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export async function listPayments(prisma: PrismaClient, filters: ListPaymentsFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Prisma.PaymentWhereInput = {
    ...(filters.partyId && { partyId: filters.partyId }),
    ...(filters.paymentType && {
      paymentType: filters.paymentType as 'SUPPLIER_PAYMENT' | 'CUSTOMER_PAYMENT',
    }),
    ...(filters.method && {
      method: filters.method as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER',
    }),
    ...(filters.search && {
      paymentNumber: { contains: filters.search, mode: 'insensitive' },
    }),
    ...((filters.from || filters.to) && {
      paymentDate: {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { paymentDate: 'desc' },
      include: { party: true },
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, total, page, pageSize: limit };
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getPaymentById(prisma: PrismaClient, id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { party: true },
  });
  if (!payment) throw new AppError(404, 'Payment not found');
  return payment;
}

// NOTE: Payments are not cancellable/reversible in v1.
// If a payment was entered incorrectly, a correcting entry (new payment or
// manual ledger adjustment) must be created. This keeps the audit trail clean.
