import apiClient from '@/lib/api-client';
import type { CreatePurchaseInput, Purchase, PaginatedResponse } from '@scrap-erp/shared-types';

type ApiData<T> = { success: true; data: T };

export type PurchasesFilters = {
  search?: string;
  partyId?: string;
  warehouseId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export async function getPurchases(filters: PurchasesFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const res = await apiClient.get<ApiData<PaginatedResponse<Purchase>>>(
    `/api/v1/purchases?${params}`,
  );
  return res.data.data;
}

export async function getPurchase(id: string) {
  const res = await apiClient.get<ApiData<Purchase>>(`/api/v1/purchases/${id}`);
  return res.data.data;
}

export async function createPurchase(data: CreatePurchaseInput) {
  const res = await apiClient.post<ApiData<Purchase>>('/api/v1/purchases', data);
  return res.data.data;
}

export async function cancelPurchase(id: string) {
  const res = await apiClient.patch<ApiData<Purchase>>(`/api/v1/purchases/${id}/cancel`);
  return res.data.data;
}
