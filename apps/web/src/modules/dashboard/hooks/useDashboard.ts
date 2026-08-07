import { useQuery } from '@tanstack/react-query';
import {
  getDashboardSummary, getSalesTrend, getPurchasesTrend,
  getTopItems, getTopParties, type DateRange,
} from '../services/dashboard.service';

export function useDashboardSummary(range: DateRange) {
  return useQuery({ queryKey: ['dashboard-summary', range], queryFn: () => getDashboardSummary(range), staleTime: 30_000 });
}

export function useSalesTrend(range: DateRange, groupBy: 'day' | 'week' | 'month') {
  return useQuery({ queryKey: ['sales-trend', range, groupBy], queryFn: () => getSalesTrend(range, groupBy), staleTime: 30_000 });
}

export function usePurchasesTrend(range: DateRange, groupBy: 'day' | 'week' | 'month') {
  return useQuery({ queryKey: ['purchases-trend', range, groupBy], queryFn: () => getPurchasesTrend(range, groupBy), staleTime: 30_000 });
}

export function useTopItems(range: DateRange) {
  return useQuery({ queryKey: ['top-items', range], queryFn: () => getTopItems(range), staleTime: 30_000 });
}

export function useTopParties(range: DateRange, type: 'customer' | 'supplier') {
  return useQuery({ queryKey: ['top-parties', range, type], queryFn: () => getTopParties(range, type), staleTime: 30_000 });
}
