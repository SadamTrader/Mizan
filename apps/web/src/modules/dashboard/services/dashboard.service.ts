import apiClient from '@/lib/api-client';

type ApiData<T> = { data: T };

export type DashboardSummary = {
  period: { from: string; to: string };
  purchases: { count: number; total: string };
  sales: { count: number; total: string };
  payments: { supplier: { count: number; total: string }; customer: { count: number; total: string } };
  expenses: { total: string };
  netProfit: string;
  outstandingReceivables: string;
  outstandingPayables: string;
};

export type TrendPoint = { period: string; count: number; total: string };
export type TopItem = { itemId: string; name: string; itemCode: string; unit: string; totalQuantity: string; totalRevenue: string };
export type TopParty = { partyId: string; name: string; partyCode: string; total: string; count: number };

export type DateRange = { from?: string; to?: string };

function params(obj: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v !== undefined && v !== '') p.set(k, String(v)); });
  return p.toString();
}

export async function getDashboardSummary(range: DateRange) {
  const res = await apiClient.get<ApiData<DashboardSummary>>(`/api/v1/dashboard/summary?${params(range)}`);
  return res.data.data;
}

export async function getSalesTrend(range: DateRange, groupBy: 'day' | 'week' | 'month') {
  const res = await apiClient.get<ApiData<TrendPoint[]>>(`/api/v1/dashboard/sales-trend?${params({ ...range, groupBy })}`);
  return res.data.data;
}

export async function getPurchasesTrend(range: DateRange, groupBy: 'day' | 'week' | 'month') {
  const res = await apiClient.get<ApiData<TrendPoint[]>>(`/api/v1/dashboard/purchases-trend?${params({ ...range, groupBy })}`);
  return res.data.data;
}

export async function getTopItems(range: DateRange) {
  const res = await apiClient.get<ApiData<TopItem[]>>(`/api/v1/dashboard/top-items?${params({ ...range, limit: 10 })}`);
  return res.data.data;
}

export async function getTopParties(range: DateRange, type: 'customer' | 'supplier') {
  const res = await apiClient.get<ApiData<TopParty[]>>(`/api/v1/dashboard/top-parties?${params({ ...range, type, limit: 10 })}`);
  return res.data.data;
}
