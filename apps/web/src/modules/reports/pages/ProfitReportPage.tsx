import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import apiClient from '@/lib/api-client';
import { useParties } from '@/modules/parties/hooks/useParties';
import { useWarehouses } from '@/modules/warehouses/hooks/useWarehouses';
import { SearchableSelect } from '@/components/SearchableSelect';
import type { ProfitReport, ProfitReportRow } from '@scrap-erp/shared-types';

type ApiData<T> = { data: T };

function useProfitReport(filters: {
  from?: string; to?: string; partyId?: string; warehouseId?: string;
}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  return useQuery({
    queryKey: ['profit-report', filters],
    queryFn: async () => {
      const res = await apiClient.get<ApiData<ProfitReport>>(`/api/v1/sales/reports/profit?${params}`);
      return res.data.data;
    },
  });
}

function fmt(v: string | number) {
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const col = createColumnHelper<ProfitReportRow>();

export function ProfitReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [partyId, setPartyId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const { data: partiesData } = useParties({ limit: 200 });
  const { data: warehousesData } = useWarehouses();

  const partyOptions = [
    { value: '', label: 'All Parties' },
    ...(partiesData?.items ?? []).map((p) => ({ value: p.id, label: p.name, sub: p.partyCode })),
  ];
  const warehouseOptions = [
    { value: '', label: 'All Warehouses' },
    ...(warehousesData ?? []).map((w) => ({ value: w.id, label: w.name })),
  ];

  const { data: report, isLoading, isError } = useProfitReport({
    from: from || undefined,
    to: to || undefined,
    partyId: partyId || undefined,
    warehouseId: warehouseId || undefined,
  });

  const columns = [
    col.accessor('saleNumber', {
      header: 'Sale No',
      cell: (i) => <span className="font-mono text-sm text-blue-600">{i.getValue()}</span>,
    }),
    col.accessor('saleDate', {
      header: 'Date',
      cell: (i) => new Date(i.getValue()).toLocaleDateString(),
    }),
    col.accessor('partyName', {
      header: 'Party',
      cell: (i) => i.getValue() ?? '—',
    }),
    col.accessor('grossAmount', {
      header: 'Revenue',
      cell: (i) => <span className="tabular-nums">{fmt(i.getValue())}</span>,
    }),
    col.accessor('expenseAmount', {
      header: 'Expense',
      cell: (i) => <span className="tabular-nums text-orange-600">{fmt(i.getValue())}</span>,
    }),
    col.accessor('cogs', {
      header: 'COGS',
      cell: (i) => <span className="tabular-nums text-red-600">{fmt(i.getValue())}</span>,
    }),
    col.accessor('netProfit', {
      header: 'Net Profit',
      cell: (i) => {
        const val = Number(i.getValue());
        return (
          <span className={`tabular-nums font-semibold ${val >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmt(i.getValue())}
          </span>
        );
      },
    }),
    col.accessor('marginPct', {
      header: 'Margin %',
      cell: (i) => {
        const val = Number(i.getValue());
        return (
          <span className={`tabular-nums text-sm ${val >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmt(i.getValue())}%
          </span>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: report?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const s = report?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Profit Report</h2>
        <p className="text-sm text-gray-500">
          Net profit = Revenue − Expenses − COGS (weighted avg cost at time of sale)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border rounded-lg p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div className="w-52">
          <label className="block text-xs font-medium text-gray-500 mb-1">Party</label>
          <SearchableSelect options={partyOptions} value={partyId} onChange={setPartyId} placeholder="All Parties" />
        </div>
        <div className="w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Warehouse</label>
          <SearchableSelect options={warehouseOptions} value={warehouseId} onChange={setWarehouseId} placeholder="All Warehouses" />
        </div>
      </div>

      {/* Summary cards */}
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard label="Total Sales" value={String(s.totalSales)} />
          <SummaryCard label="Total Revenue" value={fmt(s.totalRevenue)} />
          <SummaryCard label="Total Expenses" value={fmt(s.totalExpense)} />
          <SummaryCard label="Total COGS" value={fmt(s.totalCogs)} />
          <SummaryCard
            label="Net Profit"
            value={fmt(s.totalProfit)}
            sub={`${fmt(s.profitMarginPct)}% margin`}
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-500">Failed to load report</div>
        ) : (report?.rows.length ?? 0) === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 font-medium">No sales in this range</p>
            <p className="text-sm text-gray-400 mt-1">Adjust the date range or filters</p>
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
    </div>
  );
}
