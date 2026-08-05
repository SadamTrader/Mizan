import apiClient from '@/lib/api-client';

type ApiData<T> = { success: true; data: T };

export type StockRow = {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  category: string | null;
  stock: string;
};

export type StockResponse = {
  items: StockRow[];
  total: number;
  page: number;
  pageSize: number;
  warehouseId: string;
};

export type StockMovement = {
  id: string;
  movementType: 'PURCHASE_IN' | 'SALE_OUT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  quantity: string;
  balanceAfter: string;
  referenceType: string;
  referenceId: string;
  notes: string | null;
  createdAt: string;
  item?: { name: string; itemCode: string; unit: string };
  warehouse?: { name: string };
};

export type MovementsResponse = {
  items: StockMovement[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdjustmentInput = {
  itemId: string;
  warehouseId: string;
  quantity: number;
  reason: string;
};

export async function getStock(warehouseId: string, search?: string, page = 1, limit = 20) {
  const params = new URLSearchParams({ warehouseId, page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  const res = await apiClient.get<ApiData<StockResponse>>(`/api/v1/inventory/stock?${params}`);
  return res.data.data;
}

export async function getMovements(
  itemId: string,
  warehouseId: string,
  filters: { from?: string; to?: string; page?: number; limit?: number } = {},
) {
  const params = new URLSearchParams({ itemId, warehouseId });
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params.set(k, String(v)); });
  const res = await apiClient.get<ApiData<MovementsResponse>>(`/api/v1/inventory/movements?${params}`);
  return res.data.data;
}

export async function createAdjustment(data: AdjustmentInput) {
  const res = await apiClient.post<ApiData<StockMovement & { reason: string; previousStock: string }>>(
    '/api/v1/inventory/adjustments', data,
  );
  return res.data.data;
}
