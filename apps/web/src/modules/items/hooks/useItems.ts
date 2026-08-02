import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getItems, getItem, createItem, updateItem, deactivateItem, type ItemsFilters } from '../services/items.service';
import type { CreateItemInput, UpdateItemInput } from '@scrap-erp/shared-types';

export const ITEMS_KEY = 'items';

type ApiErr = { response?: { data?: { message?: string } } };
const errMsg = (e: unknown, fallback: string) =>
  (e as ApiErr)?.response?.data?.message ?? fallback;

export function useItems(filters: ItemsFilters = {}) {
  return useQuery({ queryKey: [ITEMS_KEY, filters], queryFn: () => getItems(filters) });
}

export function useItem(id: string) {
  return useQuery({ queryKey: [ITEMS_KEY, id], queryFn: () => getItem(id), enabled: !!id });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateItemInput) => createItem(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [ITEMS_KEY] }); toast.success('Item created'); },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to create item')),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateItemInput }) => updateItem(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [ITEMS_KEY] }); toast.success('Item updated'); },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to update item')),
  });
}

export function useDeactivateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [ITEMS_KEY] }); toast.success('Item deactivated'); },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to deactivate item')),
  });
}
