import apiClient from '@/lib/api-client';
import type { CreateVehicleInput, UpdateVehicleInput, Vehicle, PaginatedResponse } from '@scrap-erp/shared-types';

type ApiData<T> = { success: true; data: T };

export type VehiclesFilters = { search?: string; page?: number; limit?: number };

export async function getVehicles(filters: VehiclesFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const res = await apiClient.get<ApiData<PaginatedResponse<Vehicle>>>(`/api/v1/vehicles?${params}`);
  return res.data.data;
}

export async function getVehicle(id: string) {
  const res = await apiClient.get<ApiData<Vehicle>>(`/api/v1/vehicles/${id}`);
  return res.data.data;
}

export async function createVehicle(data: CreateVehicleInput) {
  const res = await apiClient.post<ApiData<Vehicle>>('/api/v1/vehicles', data);
  return res.data.data;
}

export async function updateVehicle(id: string, data: UpdateVehicleInput) {
  const res = await apiClient.patch<ApiData<Vehicle>>(`/api/v1/vehicles/${id}`, data);
  return res.data.data;
}

export async function deactivateVehicle(id: string) {
  const res = await apiClient.delete<ApiData<null>>(`/api/v1/vehicles/${id}`);
  return res.data;
}
