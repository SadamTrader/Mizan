import { useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import type { Party } from '@scrap-erp/shared-types';
import { useParties } from '../hooks/useParties';
import { PartyForm } from '../components/PartyForm';
import { PartyDetailDrawer } from '../components/PartyDetailDrawer';
import { useDebounce } from '@/hooks/useDebounce';

type FilterType = 'all' | 'supplier' | 'customer';

const col = createColumnHelper<Party>();

export function PartiesListPage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [page, setPage] = useState(1);

  // Modal / drawer state
  const [showCreate, setShowCreate] = useState(false);
  const [editParty, setEditParty] = useState<Party | null>(null);
  const [detailParty, setDetailParty] = useState<Party | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const queryFilters = {
    search: debouncedSearch || undefined,
    isSupplier: filterType === 'supplier' ? true : undefined,
    isCustomer: filterType === 'customer' ? true : undefined,
    page,
    limit: 20,
  };

  const { data, isLoading, isError } = useParties(queryFilters);

  const columns = [
    col.accessor('partyCode', {
      header: 'Code',
      cell: (info) => (
        <span className="font-mono text-xs text-gray-500">{info.getValue()}</span>
      ),
    }),
    col.accessor('name', {
      header: 'Name',
      cell: (info) => (
        <button
          className="text-gray-900 font-medium hover:underline text-left"
          onClick={() => setDetailParty(info.row.original)}
        >
          {info.getValue()}
        </button>
      ),
    }),
    col.accessor('phone', {
      header: 'Phone',
      cell: (info) => info.getValue() ?? <span className="text-gray-400">—</span>,
    }),
    col.display({
      id: 'type',
      header: 'Type',
      cell: (info) => (
        <div className="flex gap-1">
          {info.row.original.isSupplier && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
              Supplier
            </span>
          )}
          {info.row.original.isCustomer && (
            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
              Customer
            </span>
          )}
        </div>
      ),
    }),
    col.accessor('openingBalance', {
      header: 'Balance',
      cell: (info) => (
        <span className="tabular-nums">
          {Number(info.getValue()).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <button
          className="text-xs text-gray-500 hover:text-gray-900 underline"
          onClick={() => setEditParty(info.row.original)}
        >
          Edit
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data ? Math.ceil(data.total / 20) : 0,
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  const handleCloseEdit = useCallback(() => setEditParty(null), []);
  const handleCloseCreate = useCallback(() => setShowCreate(false), []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Parties</h2>
          <p className="text-sm text-gray-500">Suppliers and customers</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
        >
          + Add Party
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search name, phone, code…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value as FilterType); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="all">All</option>
          <option value="supplier">Suppliers</option>
          <option value="customer">Customers</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-500">Failed to load parties</div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 font-medium">No parties yet</p>
            <p className="text-sm text-gray-400 mt-1">Add your first supplier or customer</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 text-sm text-gray-900 underline"
            >
              Add Party
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page} of {totalPages} — {data?.total} total
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Add Party" onClose={handleCloseCreate}>
          <PartyForm mode="create" onSuccess={handleCloseCreate} />
        </Modal>
      )}

      {/* Edit Modal */}
      {editParty && (
        <Modal title="Edit Party" onClose={handleCloseEdit}>
          <PartyForm mode="edit" party={editParty} onSuccess={handleCloseEdit} />
        </Modal>
      )}

      {/* Detail Drawer */}
      {detailParty && (
        <PartyDetailDrawer
          party={detailParty}
          onClose={() => setDetailParty(null)}
          onEdit={() => { setEditParty(detailParty); setDetailParty(null); }}
        />
      )}
    </div>
  );
}

// ─── Simple inline modal ──────────────────────────────────────────────────────
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
