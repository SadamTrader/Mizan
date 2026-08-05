import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import { useAuthStore } from '@/store/auth.store';
import { useDebounce } from '@/hooks/useDebounce';
import { useWarehouses } from '@/modules/warehouses/hooks/useWarehouses';
import { useStock } from '../hooks/useInventory';
import type { StockRow } from '../services/inventory.service';

const col = createColumnHelper<StockRow>();

export function StockOverviewPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const { data: warehouses } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Auto-select first warehouse
  const effectiveWarehouseId = warehouseId || warehouses?.[0]?.id || '';

  const { data, isLoading, isError } = useStock(effectiveWarehouseId, debouncedSearch || undefined, page);

  const columns = [
    col.accessor('itemCode', {
      header: 'Code',
      cell: (i) => <span className="font-mono text-xs text-gray-500">{i.getValue()}</span>,
    }),
    col.accessor('itemName', {
      header: 'Item',
      cell: (i) => (
        <button
          className="font-medium text-gray-900 hover:text-blue-600 hover:underline text-left"
          onClick={() => navigate(`/inventory/movements?itemId=${i.row.original.itemId}&warehouseId=${effectiveWarehouseId}`)}
        >
          {i.getValue()}
        </button>
      ),
    }),
    col.accessor('category', {
      header: 'Category',
      cell: (i) => i.getValue() ?? <span className="text-gray-400">—</span>,
    }),
    col.accessor('unit', {
      header: 'Unit',
      cell: (i) => <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{i.getValue()}</span>,
    }),
    col.accessor('stock', {
      header: 'Current Stock',
      cell: (i) => {
        const val = Number(i.getValue());
        return (
          <span className={`tabular-nums font-semibold ${val === 0 ? 'text-gray-400' : val < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {val.toLocaleString('en-US', { minimumFractionDigits: 3 })}
          </span>
        );
      },
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: (i) => (
        <div className="flex gap-2">
          <button
            className="text-xs text-gray-500 hover:text-gray-900 underline"
            onClick={() => navigate(`/inventory/movements?itemId=${i.row.original.itemId}&warehouseId=${effectiveWarehouseId}`)}
          >
            History
          </button>
          {role === 'ADMIN' && (
            <button
              className="text-xs text-blue-600 hover:text-blue-800 underline"
              onClick={() => navigate(`/inventory/adjustments?itemId=${i.row.original.itemId}&warehouseId=${effectiveWarehouseId}`)}
            >
              Adjust
            </button>
          )}
        </div>
      ),
    }),
  ];

  const table = useReactTable({ data: data?.items ?? [], columns, getCoreRowModel: getCoreRowModel(), manualPagination: true });
  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventory</h2>
          <p className="text-sm text-gray-500">Current stock by warehouse</p>
        </div>
        {role === 'ADMIN' && (
          <button
            onClick={() => navigate('/inventory/adjustments')}
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            + Manual Adjustment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={effectiveWarehouseId}
          onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          {(warehouses ?? []).map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search item name or code…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-56"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {!effectiveWarehouseId ? (
          <div className="p-8 text-center text-sm text-gray-400">Select a warehouse to view stock</div>
        ) : isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-500">Failed to load stock</div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 font-medium">No stock data yet</p>
            <p className="text-sm text-gray-400 mt-1">Create purchases to populate inventory</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} of {totalPages} — {data?.total} items</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
