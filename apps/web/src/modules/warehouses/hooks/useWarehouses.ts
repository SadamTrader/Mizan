import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getWarehouses, getWarehouse, createWarehouse, updateWarehouse, deactivateWarehouse } from '../services/warehouses.service';
import type { CreateWarehouseInput, UpdateWarehouseInput } from '@scrap-erp/shared-types';

export const WAREHOUSES_KEY = 'warehouses';

type ApiErr = { response?: { data?: { message?: string } } };
const errMsg = (e: unknown, fallback: string) => (e as ApiErr)?.response?.data?.message ?? fallback;

export function useWarehouses() {
  return useQuery({ queryKey: [WAREHOUSES_KEY], queryFn: getWarehouses });
}

export function useWarehouse(id: string) {
  return useQuery({ queryKey: [WAREHOUSES_KEY, id], queryFn: () => getWarehouse(id), enabled: !!id });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWarehouseInput) => createWarehouse(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [WAREHOUSES_KEY] }); toast.success('Warehouse created'); },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to create warehouse')),
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWarehouseInput }) => updateWarehouse(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [WAREHOUSES_KEY] }); toast.success('Warehouse updated'); },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to update warehouse')),
  });
}

export function useDeactivateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateWarehouse(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [WAREHOUSES_KEY] }); toast.success('Warehouse deactivated'); },
    // Surface exact backend error (e.g. "Cannot deactivate the only active warehouse")
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to deactivate warehouse')),
  });
}
