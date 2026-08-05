import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import { useMovements } from '../hooks/useInventory';
import type { StockMovement } from '../services/inventory.service';

const col = createColumnHelper<StockMovement>();

const TYPE_COLORS: Record<string, string> = {
  PURCHASE_IN: 'bg-green-100 text-green-700',
  ADJUSTMENT_IN: 'bg-blue-100 text-blue-700',
  SALE_OUT: 'bg-orange-100 text-orange-700',
  ADJUSTMENT_OUT: 'bg-red-100 text-red-700',
};
const TYPE_LABELS: Record<string, string> = {
  PURCHASE_IN: 'Purchase In',
  SALE_OUT: 'Sale Out',
  ADJUSTMENT_IN: 'Adj. In',
  ADJUSTMENT_OUT: 'Adj. Out',
};

export function MovementHistoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId') ?? '';
  const warehouseId = searchParams.get('warehouseId') ?? '';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useMovements(itemId, warehouseId, {
    from: from || undefined, to: to || undefined, page,
  });

  const itemName = data?.items[0]?.item?.name ?? 'Item';
  const warehouseName = data?.items[0]?.warehouse?.name ?? '';

  const columns = [
    col.accessor('createdAt', {
      header: 'Date',
      cell: (i) => new Date(i.getValue()).toLocaleDateString(),
    }),
    col.accessor('movementType', {
      header: 'Type',
      cell: (i) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[i.getValue()] ?? 'bg-gray-100 text-gray-600'}`}>
          {TYPE_LABELS[i.getValue()] ?? i.getValue()}
        </span>
      ),
    }),
    col.accessor('quantity', {
      header: 'Quantity',
      cell: (i) => {
        const isOut = i.row.original.movementType.includes('OUT');
        return (
          <span className={`tabular-nums font-medium ${isOut ? 'text-red-600' : 'text-green-600'}`}>
            {isOut ? '−' : '+'}{Number(i.getValue()).toFixed(3)}
          </span>
        );
      },
    }),
    col.accessor('balanceAfter', {
      header: 'Balance After',
      cell: (i) => <span className="tabular-nums font-semibold">{Number(i.getValue()).toFixed(3)}</span>,
    }),
    col.accessor('referenceType', {
      header: 'Reference',
      cell: (i) => <span className="text-xs text-gray-500 font-mono">{i.getValue()}</span>,
    }),
    col.accessor('notes', {
      header: 'Notes',
      cell: (i) => i.getValue() ?? <span className="text-gray-400">—</span>,
    }),
  ];

  const table = useReactTable({ data: data?.items ?? [], columns, getCoreRowModel: getCoreRowModel(), manualPagination: true });
  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="space-y-4">
      <div>
        <button onClick={() => navigate('/inventory')} className="text-sm text-gray-500 hover:text-gray-900 mb-2 block">
          ← Back to Inventory
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {itemName} — Movement History
        </h2>
        {warehouseName && <p className="text-sm text-gray-500">Warehouse: {warehouseName}</p>}
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
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          : isError ? <div className="p-8 text-center text-sm text-red-500">Failed to load movements</div>
          : (data?.items.length ?? 0) === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 font-medium">No movements found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>{hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}</tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} of {totalPages} — {data?.total} total</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
