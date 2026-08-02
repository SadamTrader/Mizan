import { Decimal } from 'decimal.js';
import type { TxClient } from './stock.js';

/**
 * Returns the current balance for a party.
 * Balance = openingBalance + sum(credits) - sum(debits) across all LedgerEntries.
 *
 * Always calculated from LedgerEntry records — never stored directly on Party.
 * MUST be called with the transaction client (tx) when inside a $transaction.
 *
 * Convention used throughout this system:
 *   credit > 0 → we owe the party (e.g. after a Purchase — supplier payable)
 *   debit  > 0 → the party owes us  (e.g. after a Sale — customer receivable)
 * Positive balance = we owe the party; negative = party owes us.
 */
export async function calculatePartyBalance(partyId: string, tx: TxClient): Promise<Decimal> {
  const party = await tx.party.findUnique({
    where: { id: partyId },
    select: { openingBalance: true },
  });

  const opening = new Decimal(party?.openingBalance?.toString() ?? '0');

  const result = await tx.ledgerEntry.aggregate({
    where: { partyId },
    _sum: { credit: true, debit: true },
  });

  const totalCredit = new Decimal(result._sum.credit?.toString() ?? '0');
  const totalDebit = new Decimal(result._sum.debit?.toString() ?? '0');

  return opening.plus(totalCredit).minus(totalDebit);
}
