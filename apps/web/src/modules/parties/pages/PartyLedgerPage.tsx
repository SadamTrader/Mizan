import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useParty } from '../hooks/useParties';
import { usePartyLedger, usePartyBalance } from '@/modules/payments/hooks/usePayments';

const TYPE_LABELS: Record<string, string> = {
  PURCHASE: 'Purchase', SALE: 'Sale', PAYMENT: 'Payment', EXPENSE_ADJUSTMENT: 'Adjustment',
};

function fmt(v: string | number) {
  const n = Number(v);
  if (n === 0) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export function PartyLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data: party } = useParty(id ?? '');
  const { data: balData } = usePartyBalance(id ?? '');
  const { data: ledger, isLoading, isError } = usePartyLedger(id ?? '', {
    from: from || undefined, to: to || undefined, page, limit: 50,
  });

  const liveBalance = Number(balData?.balance ?? 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/parties')} className="text-sm text-gray-500 hover:text-gray-900 mb-2 block">
          ← Back to Parties
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {party?.name ?? 'Party'} — Ledger
            </h2>
            <p className="text-sm text-gray-500">{party?.partyCode}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Live Balance</p>
            <p className={`text-2xl font-bold ${liveBalance > 0 ? 'text-orange-600' : liveBalance < 0 ? 'text-blue-600' : 'text-gray-500'}`}>
              {liveBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400">
              {liveBalance > 0 ? 'We owe them' : liveBalance < 0 ? 'They owe us' : 'Settled'}
            </p>
          </div>
        </div>
      </div>

      {/* Date filters */}
      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        {(from || to) && (
          <div className="flex items-end">
            <button onClick={() => { setFrom(''); setTo(''); setPage(1); }}
              className="text-sm text-gray-500 hover:text-gray-900 underline pb-2">Clear</button>
          </div>
        )}
      </div>

      {/* Opening balance for period */}
      {ledger && (
        <div className="bg-gray-50 border rounded-lg px-4 py-3 text-sm flex justify-between">
          <span className="text-gray-500">Opening balance {from ? `(as of ${from})` : ''}</span>
          <span className="font-medium tabular-nums">
            {Number(ledger.openingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Ledger table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          : isError ? <div className="p-8 text-center text-sm text-red-500">Failed to load ledger</div>
          : (ledger?.entries.length ?? 0) === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 font-medium">No transactions yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Date', 'Type', 'Reference', 'Debit', 'Credit', 'Balance'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledger?.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{new Date(entry.entryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {TYPE_LABELS[entry.transactionType] ?? entry.transactionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{entry.referenceType}</td>
                    <td className="px-4 py-3 tabular-nums text-red-600">{fmt(entry.debit)}</td>
                    <td className="px-4 py-3 tabular-nums text-green-600">{fmt(entry.credit)}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {Number(entry.balanceAfter).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Pagination */}
      {(ledger?.total ?? 0) > 50 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} — {ledger?.total} total entries</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={(ledger?.entries.length ?? 0) < 50} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
