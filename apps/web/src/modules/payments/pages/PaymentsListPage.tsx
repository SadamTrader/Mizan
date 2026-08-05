import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import type { Payment } from '@scrap-erp/shared-types';
import { useDebounce } from '@/hooks/useDebounce';
import { usePayments } from '../hooks/usePayments';

const col = createColumnHelper<Payment>();

const TYPE_LABELS: Record<string, string> = {
  SUPPLIER_PAYMENT: 'Pay Supplier', CUSTOMER_PAYMENT: 'Receive from Customer',
};
const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque', OTHER: 'Other',
};

export function PaymentsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [method, setMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError } = usePayments({
    search: debouncedSearch || undefined,
    paymentType: paymentType || undefined,
    method: method || undefined,
    from: from || undefined,
    to: to || undefined,
    page, limit: 20,
  });

  const columns = [
    col.accessor('paymentNumber', {
      header: 'Payment No',
      cell: (i) => (
        <button className="font-mono text-sm text-blue-600 hover:underline"
          onClick={() => navigate(`/payments/${i.row.original.id}`)}>
          {i.getValue()}
        </button>
      ),
    }),
    col.accessor('party', {
      header: 'Party',
      cell: (i) => <span className="font-medium">{i.getValue()?.name ?? '—'}</span>,
    }),
    col.accessor('paymentType', {
      header: 'Type',
      cell: (i) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          i.getValue() === 'SUPPLIER_PAYMENT' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {TYPE_LABELS[i.getValue()] ?? i.getValue()}
        </span>
      ),
    }),
    col.accessor('amount', {
      header: 'Amount',
      cell: (i) => <span className="tabular-nums font-medium">{Number(i.getValue()).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
    }),
    col.accessor('method', {
      header: 'Method',
      cell: (i) => METHOD_LABELS[i.getValue()] ?? i.getValue(),
    }),
    col.accessor('paymentDate', {
      header: 'Date',
      cell: (i) => new Date(i.getValue()).toLocaleDateString(),
    }),
    col.display({
      id: 'actions', header: '',
      cell: (i) => (
        <button className="text-xs text-gray-500 hover:text-gray-900 underline"
          onClick={() => navigate(`/payments/${i.row.original.id}`)}>View</button>
      ),
    }),
  ];

  const table = useReactTable({ data: data?.items ?? [], columns, getCoreRowModel: getCoreRowModel(), manualPagination: true });
  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Payments</h2>
          <p className="text-sm text-gray-500">Supplier payments and customer receipts</p>
        </div>
        <button onClick={() => navigate('/payments/new')}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
          + Record Payment
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search payment no…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-48" />
        <select value={paymentType} onChange={(e) => { setPaymentType(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All Types</option>
          <option value="SUPPLIER_PAYMENT">Pay Supplier</option>
          <option value="CUSTOMER_PAYMENT">Receive from Customer</option>
        </select>
        <select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All Methods</option>
          <option value="CASH">Cash</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CHEQUE">Cheque</option>
          <option value="OTHER">Other</option>
        </select>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" title="From date" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" title="To date" />
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          : isError ? <div className="p-8 text-center text-sm text-red-500">Failed to load payments</div>
          : data?.items.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 font-medium">No payments yet</p>
              <p className="text-sm text-gray-400 mt-1">Record your first payment</p>
              <button onClick={() => navigate('/payments/new')} className="mt-4 text-sm text-gray-900 underline">Record Payment</button>
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
