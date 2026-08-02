import { useState } from 'react';
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import type { Warehouse } from '@scrap-erp/shared-types';
import { useAuthStore } from '@/store/auth.store';
import { useWarehouses, useDeactivateWarehouse } from '../hooks/useWarehouses';
import { WarehouseForm } from '../components/WarehouseForm';

const col = createColumnHelper<Warehouse>();

export function WarehousesListPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  const deactivate = useDeactivateWarehouse();

  const { data: warehouses, isLoading, isError } = useWarehouses();

  const columns = [
    col.accessor('name', { header: 'Name', cell: (i) => <span className="font-medium text-gray-900">{i.getValue()}</span> }),
    col.accessor('address', { header: 'Address', cell: (i) => i.getValue() ?? <span className="text-gray-400">—</span> }),
    col.accessor('isActive', {
      header: 'Status',
      cell: (i) => i.getValue()
        ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Active</span>
        : <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">Inactive</span>,
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: (i) => (
        <div className="flex gap-2">
          <button onClick={() => setEditWarehouse(i.row.original)} className="text-xs text-gray-500 hover:text-gray-900 underline">Edit</button>
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

  const table = useReactTable({ data: warehouses ?? [], columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Warehouses</h2>
          <p className="text-sm text-gray-500">Storage locations</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">+ Add Warehouse</button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          : isError ? <div className="p-8 text-center text-sm text-red-500">Failed to load warehouses</div>
          : (
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

      {showCreate && <Modal title="Add Warehouse" onClose={() => setShowCreate(false)}><WarehouseForm mode="create" onSuccess={() => setShowCreate(false)} /></Modal>}
      {editWarehouse && <Modal title="Edit Warehouse" onClose={() => setEditWarehouse(null)}><WarehouseForm mode="edit" warehouse={editWarehouse} onSuccess={() => setEditWarehouse(null)} /></Modal>}
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
