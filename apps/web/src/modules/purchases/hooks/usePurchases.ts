import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getPurchases,
  getPurchase,
  createPurchase,
  cancelPurchase,
  type PurchasesFilters,
} from '../services/purchases.service';
import { PARTIES_KEY } from '@/modules/parties/hooks/useParties';
import type { CreatePurchaseInput } from '@scrap-erp/shared-types';

export const PURCHASES_KEY = 'purchases';

type ApiErr = { response?: { data?: { message?: string } } };
const errMsg = (e: unknown, fallback: string) =>
  (e as ApiErr)?.response?.data?.message ?? fallback;

export function usePurchases(filters: PurchasesFilters = {}) {
  return useQuery({
    queryKey: [PURCHASES_KEY, filters],
    queryFn: () => getPurchases(filters),
  });
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: [PURCHASES_KEY, id],
    queryFn: () => getPurchase(id),
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePurchaseInput) => createPurchase(data),
    onSuccess: (purchase) => {
      qc.invalidateQueries({ queryKey: [PURCHASES_KEY] });
      // Invalidate the party — their balance changed
      qc.invalidateQueries({ queryKey: [PARTIES_KEY, purchase.partyId] });
      qc.invalidateQueries({ queryKey: [PARTIES_KEY] });
    },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to create purchase')),
  });
}

export function useCancelPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelPurchase(id),
    onSuccess: (purchase) => {
      qc.invalidateQueries({ queryKey: [PURCHASES_KEY] });
      qc.invalidateQueries({ queryKey: [PARTIES_KEY, purchase.partyId] });
      qc.invalidateQueries({ queryKey: [PARTIES_KEY] });
      toast.success('Purchase cancelled successfully');
    },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to cancel purchase')),
  });
}
