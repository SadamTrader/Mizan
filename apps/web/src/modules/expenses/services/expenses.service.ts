import apiClient from '@/lib/api-client';
import type { CreateExpenseInput, UpdateExpenseInput, Expense, PaginatedResponse } from '@scrap-erp/shared-types';

type ApiData<T> = { success: true; data: T };

export type ExpensesFilters = {
  search?: string;
  category?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export async function getExpenses(filters: ExpensesFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)); });
  const res = await apiClient.get<ApiData<PaginatedResponse<Expense>>>(`/api/v1/expenses?${params}`);
  return res.data.data;
}

export async function getExpense(id: string) {
  const res = await apiClient.get<ApiData<Expense>>(`/api/v1/expenses/${id}`);
  return res.data.data;
}

export async function createExpense(data: CreateExpenseInput) {
  const res = await apiClient.post<ApiData<Expense>>('/api/v1/expenses', data);
  return res.data.data;
}

export async function updateExpense(id: string, data: UpdateExpenseInput) {
  const res = await apiClient.patch<ApiData<Expense>>(`/api/v1/expenses/${id}`, data);
  return res.data.data;
}

export async function deleteExpense(id: string) {
  const res = await apiClient.delete<ApiData<null>>(`/api/v1/expenses/${id}`);
  return res.data;
}
