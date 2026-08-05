import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPayments, getPayment, createPayment,
  getPartyBalance, getPartyLedger,
  type PaymentsFilters, type LedgerFilters,
} from '../services/payments.service';
import { PARTIES_KEY } from '@/modules/parties/hooks/useParties';
import type { CreatePaymentInput } from '@scrap-erp/shared-types';

export const PAYMENTS_KEY = 'payments';


export function usePayments(filters: PaymentsFilters = {}) {
  return useQuery({ queryKey: [PAYMENTS_KEY, filters], queryFn: () => getPayments(filters) });
}

export function usePayment(id: string) {
  return useQuery({ queryKey: [PAYMENTS_KEY, id], queryFn: () => getPayment(id), enabled: !!id });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePaymentInput) => createPayment(data),
    onSuccess: (payment) => {
      qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
      qc.invalidateQueries({ queryKey: [PARTIES_KEY, payment.partyId] });
      qc.invalidateQueries({ queryKey: [PARTIES_KEY] });
    },
    // No generic onError — form surfaces the exact backend message
  });
}

export function usePartyBalance(partyId: string) {
  return useQuery({
    queryKey: ['party-balance', partyId],
    queryFn: () => getPartyBalance(partyId),
    enabled: !!partyId,
    staleTime: 5_000,
  });
}

export function usePartyLedger(partyId: string, filters: LedgerFilters = {}) {
  return useQuery({
    queryKey: ['party-ledger', partyId, filters],
    queryFn: () => getPartyLedger(partyId, filters),
    enabled: !!partyId,
  });
}
