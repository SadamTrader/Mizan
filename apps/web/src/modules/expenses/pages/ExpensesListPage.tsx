import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import type { Expense } from '@scrap-erp/shared-types';
import { useAuthStore } from '@/store/auth.store';
import { useDebounce } from '@/hooks/useDebounce';
import { useExpenses, useDeleteExpense } from '../hooks/useExpenses';

const col = createColumnHelper<Expense>();

const CAT_COLORS: Record<string, string> = {
  RENT: 'bg-purple-100 text-purple-700',
  SALARY: 'bg-blue-100 text-blue-700',
  FUEL: 'bg-orange-100 text-orange-700',
  UTILITIES: 'bg-yellow-100 text-yellow-700',
  MAINTENANCE: 'bg-red-100 text-red-700',
  OTHER: 'bg-gray-100 text-gray-600',
};
const CAT_LABELS: Record<string, string> = { RENT: 'Rent', SALARY: 'Salary', FUEL: 'Fuel', UTILITIES: 'Utilities', MAINTENANCE: 'Maintenance', OTHER: 'Other' };
const METHOD_LABELS: Record<string, string> = { CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque', OTHER: 'Other' };

export function ExpensesListPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const deleteMutation = useDeleteExpense();

  const { data, isLoading, isError } = useExpenses({
    search: debouncedSearch || undefined,
    category: category || undefined,
    paymentMethod: paymentMethod || undefined,
    from: from || undefined,
    to: to || undefined,
    page, limit: 20,
  });

  const columns = [
    col.accessor('expenseNumber', {
      header: 'Number',
      cell: (i) => <span className="font-mono text-xs text-gray-500">{i.getValue()}</span>,
    }),
    col.accessor('expenseDate', {
      header: 'Date',
      cell: (i) => new Date(i.getValue()).toLocaleDateString(),
    }),
    col.accessor('category', {
      header: 'Category',
      cell: (i) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[i.getValue()] ?? 'bg-gray-100 text-gray-600'}`}>
          {CAT_LABELS[i.getValue()] ?? i.getValue()}
        </span>
      ),
    }),
    col.accessor('description', {
      header: 'Description',
      cell: (i) => <span className="text-gray-700">{i.getValue()}</span>,
    }),
    col.accessor('amount', {
      header: 'Amount',
      cell: (i) => (
        <span className="tabular-nums font-semibold">
          {Number(i.getValue()).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    }),
    col.accessor('paymentMethod', {
      header: 'Method',
      cell: (i) => METHOD_LABELS[i.getValue()] ?? i.getValue(),
    }),
    ...(role === 'ADMIN' ? [col.display({
      id: 'actions',
      header: '',
      cell: (i) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/expenses/${i.row.original.id}/edit`)}
            className="text-xs text-gray-500 hover:text-gray-900 underline"
          >Edit</button>
          <button
            onClick={() => setConfirmDelete(i.row.original)}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >Delete</button>
        </div>
      ),
    })] : []),
  ];

  const table = useReactTable({ data: data?.items ?? [], columns, getCoreRowModel: getCoreRowModel(), manualPagination: true });
  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Expenses</h2>
          <p className="text-sm text-gray-500">Business operating costs</p>
        </div>
        {role === 'ADMIN' && (
          <button onClick={() => navigate('/expenses/new')} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
            + Record Expense
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-44" />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All Categories</option>
          {['RENT','SALARY','FUEL','UTILITIES','MAINTENANCE','OTHER'].map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
        </select>
        <select value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All Methods</option>
          {['CASH','BANK_TRANSFER','CHEQUE','OTHER'].map((m) => <option key={m} value={m}>{METHOD_LABELS[m] ?? m}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" title="From" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" title="To" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          : isError ? <div className="p-8 text-center text-sm text-red-500">Failed to load expenses</div>
          : (data?.items.length ?? 0) === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 font-medium">No expenses yet</p>
              {role === 'ADMIN' && <button onClick={() => navigate('/expenses/new')} className="mt-4 text-sm text-gray-900 underline">Record Expense</button>}
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

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Delete this expense?</h3>
            <p className="text-sm text-gray-600">
              <strong>{confirmDelete.expenseNumber}</strong> — {confirmDelete.description} ({Number(confirmDelete.amount).toFixed(2)})
            </p>
            <p className="text-sm text-gray-500">This cannot be undone.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button
                onClick={async () => { await deleteMutation.mutateAsync(confirmDelete.id); setConfirmDelete(null); }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
