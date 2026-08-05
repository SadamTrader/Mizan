import apiClient from '@/lib/api-client';
import type {
  CreatePaymentInput, Payment, PaginatedResponse,
  PartyLedger, LedgerEntry,
} from '@scrap-erp/shared-types';

type ApiData<T> = { success: true; data: T };

export type PaymentsFilters = {
  search?: string;
  partyId?: string;
  paymentType?: string;
  method?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export async function getPayments(filters: PaymentsFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)); });
  const res = await apiClient.get<ApiData<PaginatedResponse<Payment>>>(`/api/v1/payments?${params}`);
  return res.data.data;
}

export async function getPayment(id: string) {
  const res = await apiClient.get<ApiData<Payment>>(`/api/v1/payments/${id}`);
  return res.data.data;
}

export async function createPayment(data: CreatePaymentInput) {
  const res = await apiClient.post<ApiData<Payment>>('/api/v1/payments', data);
  return res.data.data;
}

export async function getPartyBalance(partyId: string) {
  const res = await apiClient.get<ApiData<{ partyId: string; balance: string }>>(`/api/v1/parties/${partyId}/balance`);
  return res.data.data;
}

export type LedgerFilters = { from?: string; to?: string; page?: number; limit?: number };

export async function getPartyLedger(partyId: string, filters: LedgerFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)); });
  const res = await apiClient.get<ApiData<PartyLedger>>(`/api/v1/parties/${partyId}/ledger?${params}`);
  return res.data.data;
}

export type { LedgerEntry };
