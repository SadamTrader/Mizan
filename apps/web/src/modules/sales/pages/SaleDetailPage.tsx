import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useSale, useCancelSale } from '../hooks/useSales';

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: sale, isLoading, isError } = useSale(id ?? '');
  const cancelMutation = useCancelSale();

  if (isLoading) return <div className="p-8 text-center text-sm text-gray-400">Loading…</div>;
  if (isError || !sale)
    return <div className="p-8 text-center text-sm text-red-500">Sale not found</div>;

  const isCancelled = sale.status === 'CANCELLED';

  const handleCancel = async () => {
    await cancelMutation.mutateAsync(sale.id);
    setShowConfirm(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{sale.saleNumber}</h2>
            <StatusBadge status={sale.status} />
          </div>
          <button
            onClick={() => navigate('/sales')}
            className="text-sm text-gray-500 hover:text-gray-900 mt-1"
          >
            ← Back to Sales
          </button>
        </div>
        {role === 'ADMIN' && !isCancelled && (
          <button
            onClick={() => setShowConfirm(true)}
            className="text-sm px-4 py-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            Cancel Sale
          </button>
        )}
      </div>

      {/* Cancelled banner */}
      {isCancelled && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600">
          This sale has been cancelled. Stock and ledger effects have been reversed.
        </div>
      )}

      {/* Info grid */}
      <div className="bg-white rounded-lg border p-5 grid grid-cols-2 gap-4 text-sm">
        <InfoRow label="Party" value={sale.party?.name ?? sale.partyId} />
        <InfoRow label="Warehouse" value={sale.warehouse?.name ?? sale.warehouseId} />
        <InfoRow label="Sale Date" value={new Date(sale.saleDate).toLocaleDateString()} />
        <InfoRow label="Status" value={sale.status} />
      </div>

      {/* Items table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">Items</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Item', 'Quantity', 'Rate', 'Amount'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(sale.items ?? []).map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.item?.name ?? item.itemId}</td>
                <td className="px-4 py-3 tabular-nums">{Number(item.quantity).toFixed(3)}</td>
                <td className="px-4 py-3 tabular-nums">{Number(item.rate).toFixed(2)}</td>
                <td className="px-4 py-3 tabular-nums font-medium">
                  {Number(item.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="bg-gray-50 rounded-lg border p-5">
        <div className="flex flex-col items-end gap-1 text-sm">
          <TotalRow label="Gross Amount" value={Number(sale.grossAmount)} />
          <TotalRow
            label="Expense Amount (internal)"
            value={Number(sale.expenseAmount)}
          />
          <div className="border-t w-64 pt-2 mt-1">
            <TotalRow label="Net Amount (billed)" value={Number(sale.netAmount)} bold />
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Cancel this sale?</h3>
            <p className="text-sm text-gray-600">
              This will reverse the stock and ledger effects of this sale. The record will remain
              in the system as cancelled. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Yes, Cancel Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'CONFIRMED'
      ? 'bg-green-100 text-green-700'
      : status === 'CANCELLED'
      ? 'bg-gray-100 text-gray-500'
      : 'bg-yellow-100 text-yellow-700';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{status}</span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function TotalRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className={`flex gap-8 justify-between w-64 ${bold ? 'font-bold text-base' : ''}`}>
      <span className={bold ? '' : 'text-gray-500'}>{label}</span>
      <span className="tabular-nums">
        {value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}
