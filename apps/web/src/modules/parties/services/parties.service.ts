import apiClient from '@/lib/api-client';
import type { CreatePartyInput, UpdatePartyInput, Party, PaginatedResponse } from '@scrap-erp/shared-types';

export type PartiesFilters = {
  search?: string;
  isSupplier?: boolean;
  isCustomer?: boolean;
  page?: number;
  limit?: number;
};

type ApiData<T> = { success: true; data: T };

export async function getParties(filters: PartiesFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.isSupplier !== undefined) params.set('isSupplier', String(filters.isSupplier));
  if (filters.isCustomer !== undefined) params.set('isCustomer', String(filters.isCustomer));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const res = await apiClient.get<ApiData<PaginatedResponse<Party>>>(
    `/api/v1/parties?${params.toString()}`,
  );
  return res.data.data;
}

export async function getParty(id: string) {
  const res = await apiClient.get<ApiData<Party>>(`/api/v1/parties/${id}`);
  return res.data.data;
}

export async function createParty(data: CreatePartyInput) {
  const res = await apiClient.post<ApiData<Party>>('/api/v1/parties', data);
  return res.data.data;
}

export async function updateParty(id: string, data: UpdatePartyInput) {
  const res = await apiClient.patch<ApiData<Party>>(`/api/v1/parties/${id}`, data);
  return res.data.data;
}

export async function deactivateParty(id: string) {
  const res = await apiClient.delete<ApiData<null>>(`/api/v1/parties/${id}`);
  return res.data;
}
