import { useState } from 'react';
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import type { ScrapItem } from '@scrap-erp/shared-types';
import { useAuthStore } from '@/store/auth.store';
import { useDebounce } from '@/hooks/useDebounce';
import { useItems, useDeactivateItem } from '../hooks/useItems';
import { ItemForm } from '../components/ItemForm';

const col = createColumnHelper<ScrapItem>();

export function ItemsListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<ScrapItem | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const role = useAuthStore((s) => s.user?.role);
  const deactivate = useDeactivateItem();

  const { data, isLoading, isError } = useItems({ search: debouncedSearch || undefined, page, limit: 20 });

  const columns = [
    col.accessor('itemCode', { header: 'Code', cell: (i) => <span className="font-mono text-xs text-gray-500">{i.getValue()}</span> }),
    col.accessor('name', { header: 'Name', cell: (i) => <span className="font-medium text-gray-900">{i.getValue()}</span> }),
    col.accessor('category', { header: 'Category', cell: (i) => i.getValue() ?? <span className="text-gray-400">—</span> }),
    col.accessor('unit', {
      header: 'Unit',
      cell: (i) => <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{i.getValue()}</span>,
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: (i) => (
        <div className="flex gap-2">
          <button onClick={() => setEditItem(i.row.original)} className="text-xs text-gray-500 hover:text-gray-900 underline">Edit</button>
          {role === 'ADMIN' && (
            <button
              onClick={() => { if (confirm(`Deactivate "${i.row.original.name}"?`)) deactivate.mutate(i.row.original.id); }}
              className="text-xs text-red-500 hover:text-red-700 underline"
            >
              Deactivate
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
          <h2 className="text-xl font-bold text-gray-900">Scrap Items</h2>
          <p className="text-sm text-gray-500">Material types you buy and sell</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">+ Add Item</button>
      </div>

      <input type="text" placeholder="Search name or code…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />

      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          : isError ? <div className="p-8 text-center text-sm text-red-500">Failed to load items</div>
          : data?.items.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 font-medium">No items yet</p>
              <p className="text-sm text-gray-400 mt-1">Add your first scrap item</p>
              <button onClick={() => setShowCreate(true)} className="mt-4 text-sm text-gray-900 underline">Add Item</button>
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

      {showCreate && <Modal title="Add Item" onClose={() => setShowCreate(false)}><ItemForm mode="create" onSuccess={() => setShowCreate(false)} /></Modal>}
      {editItem && <Modal title="Edit Item" onClose={() => setEditItem(null)}><ItemForm mode="edit" item={editItem} onSuccess={() => setEditItem(null)} /></Modal>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
