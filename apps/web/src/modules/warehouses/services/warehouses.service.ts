import apiClient from '@/lib/api-client';
import type { CreateWarehouseInput, UpdateWarehouseInput, Warehouse } from '@scrap-erp/shared-types';

type ApiData<T> = { success: true; data: T };

export async function getWarehouses() {
  const res = await apiClient.get<ApiData<Warehouse[]>>('/api/v1/warehouses');
  return res.data.data;
}

export async function getWarehouse(id: string) {
  const res = await apiClient.get<ApiData<Warehouse>>(`/api/v1/warehouses/${id}`);
  return res.data.data;
}

export async function createWarehouse(data: CreateWarehouseInput) {
  const res = await apiClient.post<ApiData<Warehouse>>('/api/v1/warehouses', data);
  return res.data.data;
}

export async function updateWarehouse(id: string, data: UpdateWarehouseInput) {
  const res = await apiClient.patch<ApiData<Warehouse>>(`/api/v1/warehouses/${id}`, data);
  return res.data.data;
}

export async function deactivateWarehouse(id: string) {
  const res = await apiClient.delete<ApiData<null>>(`/api/v1/warehouses/${id}`);
  return res.data;
}
