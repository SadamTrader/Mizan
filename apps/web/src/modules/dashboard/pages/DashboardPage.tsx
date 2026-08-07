import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  useDashboardSummary, useSalesTrend, usePurchasesTrend,
  useTopItems, useTopParties,
} from '../hooks/useDashboard';
import { fmtCurrency } from '@/lib/format';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, isLoading, isError, onClick,
  positive, negative,
}: {
  label: string; value?: string; sub?: string;
  isLoading?: boolean; isError?: boolean;
  onClick?: () => void;
  positive?: boolean; negative?: boolean;
}) {
  const valueColor = positive ? 'text-green-600' : negative ? 'text-red-600' : 'text-gray-900';
  return (
    <div
      className={`bg-white rounded-lg border p-4 ${onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
      onClick={onClick}
    >
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      {isLoading ? <Skeleton className="h-7 w-24 mt-2" /> :
       isError ? <p className="text-sm text-red-400 mt-2">Error</p> : (
        <>
          <p className={`text-2xl font-bold mt-1 tabular-nums ${valueColor}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </>
      )}
    </div>
  );
}

// ─── Chart Widget ─────────────────────────────────────────────────────────────
function TrendChart({
  title, data, isLoading, isError, color,
}: {
  title: string;
  data?: { period: string; count: number; total: string }[];
  isLoading?: boolean; isError?: boolean;
  color: string;
}) {
  const chartData = (data ?? []).map((d) => ({ period: d.period, amount: Number(d.total), count: d.count }));
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {isLoading ? <Skeleton className="h-40 w-full" /> :
       isError ? <p className="text-sm text-red-400 text-center py-8">Failed to load</p> :
       chartData.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No data</p> : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCurrency(v)} width={70} />
            <Tooltip formatter={(v) => fmtCurrency(Number(v))} />
            <Bar dataKey="amount" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState(currentMonthRange());
  const [trendGroup, setTrendGroup] = useState<'day' | 'week' | 'month'>('day');
  const [partiesTab, setPartiesTab] = useState<'customer' | 'supplier'>('customer');

  const { data: summary, isLoading: sumLoading, isError: sumError } = useDashboardSummary(range);
  const { data: salesTrend, isLoading: stLoading, isError: stError } = useSalesTrend(range, trendGroup);
  const { data: purchasesTrend, isLoading: ptLoading, isError: ptError } = usePurchasesTrend(range, trendGroup);
  const { data: topItems, isLoading: tiLoading, isError: tiError } = useTopItems(range);
  const { data: topParties, isLoading: tpLoading, isError: tpError } = useTopParties(range, partiesTab);

  const netProfitVal = Number(summary?.netProfit ?? 0);

  return (
    <div className="space-y-6">
      {/* Header + date range */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <div className="flex gap-2 items-center">
          <div>
            <label className="text-xs text-gray-500 mr-1">From</label>
            <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mr-1">To</label>
            <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <button onClick={() => setRange(currentMonthRange())}
            className="text-xs text-gray-500 hover:text-gray-900 underline">This Month</button>
        </div>
      </div>

      {/* KPI cards — each independent */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Sales" value={fmtCurrency(summary?.sales.total ?? 0)}
          sub={`${summary?.sales.count ?? 0} transactions`} isLoading={sumLoading} isError={sumError} positive />
        <KpiCard label="Total Purchases" value={fmtCurrency(summary?.purchases.total ?? 0)}
          sub={`${summary?.purchases.count ?? 0} transactions`} isLoading={sumLoading} isError={sumError} />
        <KpiCard label="Total Expenses" value={fmtCurrency(summary?.expenses.total ?? 0)}
          isLoading={sumLoading} isError={sumError} negative />
        <KpiCard label="Net Profit"
          value={fmtCurrency(summary?.netProfit ?? 0)}
          isLoading={sumLoading} isError={sumError}
          positive={netProfitVal > 0} negative={netProfitVal < 0} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Supplier Payments" value={fmtCurrency(summary?.payments.supplier.total ?? 0)}
          sub={`${summary?.payments.supplier.count ?? 0} payments`} isLoading={sumLoading} isError={sumError} />
        <KpiCard label="Customer Payments" value={fmtCurrency(summary?.payments.customer.total ?? 0)}
          sub={`${summary?.payments.customer.count ?? 0} payments`} isLoading={sumLoading} isError={sumError} />
        <KpiCard label="Outstanding Receivables"
          value={fmtCurrency(summary?.outstandingReceivables ?? 0)}
          sub="Customers owe us" isLoading={sumLoading} isError={sumError} positive
          onClick={() => navigate('/parties?isCustomer=true')} />
        <KpiCard label="Outstanding Payables"
          value={fmtCurrency(summary?.outstandingPayables ?? 0)}
          sub="We owe suppliers" isLoading={sumLoading} isError={sumError} negative
          onClick={() => navigate('/parties?isSupplier=true')} />
      </div>

      {/* Trend charts + grouping toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Trends</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map((g) => (
            <button key={g} onClick={() => setTrendGroup(g)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${trendGroup === g ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrendChart title="Sales" data={salesTrend} isLoading={stLoading} isError={stError} color="#16a34a" />
        <TrendChart title="Purchases" data={purchasesTrend} isLoading={ptLoading} isError={ptError} color="#2563eb" />
      </div>

      {/* Top items + top parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Items */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Items by Revenue</h3>
          {tiLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : tiError ? (
            <p className="text-sm text-red-400 text-center py-4">Failed to load</p>
          ) : (topItems ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No sales data</p>
          ) : (
            <div className="space-y-2">
              {(topItems ?? []).map((item, idx) => (
                <div key={item.itemId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">{Number(item.totalQuantity).toFixed(3)} {item.unit}</p>
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums text-green-600">{fmtCurrency(item.totalRevenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Parties */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Top Parties</h3>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['customer', 'supplier'] as const).map((t) => (
                <button key={t} onClick={() => setPartiesTab(t)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${partiesTab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t === 'customer' ? 'Customers' : 'Suppliers'}
                </button>
              ))}
            </div>
          </div>
          {tpLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : tpError ? (
            <p className="text-sm text-red-400 text-center py-4">Failed to load</p>
          ) : (topParties ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No data</p>
          ) : (
            <div className="space-y-2">
              {(topParties ?? []).map((party, idx) => (
                <div key={party.partyId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
                    <div>
                      <p className="font-medium text-gray-900">{party.name}</p>
                      <p className="text-xs text-gray-400">{party.partyCode} · {party.count} txns</p>
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums">{fmtCurrency(party.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
