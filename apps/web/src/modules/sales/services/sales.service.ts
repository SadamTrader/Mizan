import apiClient from '@/lib/api-client';
import type { CreateSaleInput, Sale, PaginatedResponse } from '@scrap-erp/shared-types';

type ApiData<T> = { success: true; data: T };

export type SalesFilters = {
  search?: string;
  partyId?: string;
  warehouseId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export async function getSales(filters: SalesFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const res = await apiClient.get<ApiData<PaginatedResponse<Sale>>>(
    `/api/v1/sales?${params}`,
  );
  return res.data.data;
}

export async function getSale(id: string) {
  const res = await apiClient.get<ApiData<Sale>>(`/api/v1/sales/${id}`);
  return res.data.data;
}

export async function createSale(data: CreateSaleInput) {
  const res = await apiClient.post<ApiData<Sale>>('/api/v1/sales', data);
  return res.data.data;
}

export async function cancelSale(id: string) {
  const res = await apiClient.patch<ApiData<Sale>>(`/api/v1/sales/${id}/cancel`);
  return res.data.data;
}
