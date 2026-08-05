import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getStock, getMovements, createAdjustment,
  type AdjustmentInput,
} from '../services/inventory.service';

export const STOCK_KEY = 'inventory-stock';
export const MOVEMENTS_KEY = 'inventory-movements';

export function useStock(warehouseId: string, search?: string, page = 1) {
  return useQuery({
    queryKey: [STOCK_KEY, warehouseId, search, page],
    queryFn: () => getStock(warehouseId, search, page),
    enabled: !!warehouseId,
  });
}

export function useMovements(
  itemId: string,
  warehouseId: string,
  filters: { from?: string; to?: string; page?: number } = {},
) {
  return useQuery({
    queryKey: [MOVEMENTS_KEY, itemId, warehouseId, filters],
    queryFn: () => getMovements(itemId, warehouseId, filters),
    enabled: !!itemId && !!warehouseId,
  });
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AdjustmentInput) => createAdjustment(data),
    onSuccess: (_result, vars) => {
      // Invalidate stock for this warehouse so the overview refreshes
      qc.invalidateQueries({ queryKey: [STOCK_KEY, vars.warehouseId] });
      qc.invalidateQueries({ queryKey: [MOVEMENTS_KEY, vars.itemId, vars.warehouseId] });
      toast.success('Adjustment recorded successfully');
    },
    // No generic onError — caller handles the specific message
  });
}
