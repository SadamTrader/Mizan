import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSales,
  getSale,
  createSale,
  cancelSale,
  type SalesFilters,
} from '../services/sales.service';
import { PARTIES_KEY } from '@/modules/parties/hooks/useParties';
import type { CreateSaleInput } from '@scrap-erp/shared-types';

export const SALES_KEY = 'sales';

type ApiErr = { response?: { data?: { message?: string } } };
const errMsg = (e: unknown, fallback: string) =>
  (e as ApiErr)?.response?.data?.message ?? fallback;

export function useSales(filters: SalesFilters = {}) {
  return useQuery({
    queryKey: [SALES_KEY, filters],
    queryFn: () => getSales(filters),
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: [SALES_KEY, id],
    queryFn: () => getSale(id),
    enabled: !!id,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSaleInput) => createSale(data),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: [SALES_KEY] });
      // Party balance changed — invalidate
      qc.invalidateQueries({ queryKey: [PARTIES_KEY, sale.partyId] });
      qc.invalidateQueries({ queryKey: [PARTIES_KEY] });
    },
    // No generic onError toast here — the form handles the error message directly
    // so the user gets the specific "Insufficient stock" message inline
  });
}

export function useCancelSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelSale(id),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: [SALES_KEY] });
      qc.invalidateQueries({ queryKey: [PARTIES_KEY, sale.partyId] });
      qc.invalidateQueries({ queryKey: [PARTIES_KEY] });
      toast.success('Sale cancelled successfully');
    },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to cancel sale')),
  });
}
