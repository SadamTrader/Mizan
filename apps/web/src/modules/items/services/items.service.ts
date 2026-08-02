import apiClient from '@/lib/api-client';
import type { CreateItemInput, UpdateItemInput, ScrapItem, PaginatedResponse } from '@scrap-erp/shared-types';

type ApiData<T> = { success: true; data: T };

export type ItemsFilters = {
  search?: string;
  page?: number;
  limit?: number;
};

export async function getItems(filters: ItemsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const res = await apiClient.get<ApiData<PaginatedResponse<ScrapItem>>>(`/api/v1/items?${params}`);
  return res.data.data;
}

export async function getItem(id: string) {
  const res = await apiClient.get<ApiData<ScrapItem>>(`/api/v1/items/${id}`);
  return res.data.data;
}

export async function createItem(data: CreateItemInput) {
  const res = await apiClient.post<ApiData<ScrapItem>>('/api/v1/items', data);
  return res.data.data;
}

export async function updateItem(id: string, data: UpdateItemInput) {
  const res = await apiClient.patch<ApiData<ScrapItem>>(`/api/v1/items/${id}`, data);
  return res.data.data;
}

export async function deactivateItem(id: string) {
  const res = await apiClient.delete<ApiData<null>>(`/api/v1/items/${id}`);
  return res.data;
}
