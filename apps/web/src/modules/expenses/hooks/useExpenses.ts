import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getExpenses, getExpense, createExpense, updateExpense, deleteExpense,
  type ExpensesFilters,
} from '../services/expenses.service';
import type { CreateExpenseInput, UpdateExpenseInput } from '@scrap-erp/shared-types';

export const EXPENSES_KEY = 'expenses';

type ApiErr = { response?: { data?: { message?: string } } };
const errMsg = (e: unknown, fb: string) => (e as ApiErr)?.response?.data?.message ?? fb;

export function useExpenses(filters: ExpensesFilters = {}) {
  return useQuery({ queryKey: [EXPENSES_KEY, filters], queryFn: () => getExpenses(filters) });
}

export function useExpense(id: string) {
  return useQuery({ queryKey: [EXPENSES_KEY, id], queryFn: () => getExpense(id), enabled: !!id });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseInput) => createExpense(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [EXPENSES_KEY] }); toast.success('Expense recorded'); },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to create expense')),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseInput }) => updateExpense(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [EXPENSES_KEY] }); toast.success('Expense updated'); },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to update expense')),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [EXPENSES_KEY] }); toast.success('Expense deleted'); },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to delete expense')),
  });
}
