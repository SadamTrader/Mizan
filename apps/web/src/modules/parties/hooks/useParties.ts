import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getParties,
  getParty,
  createParty,
  updateParty,
  deactivateParty,
  type PartiesFilters,
} from '../services/parties.service';
import type { CreatePartyInput, UpdatePartyInput } from '@scrap-erp/shared-types';

export const PARTIES_KEY = 'parties';

export function useParties(filters: PartiesFilters = {}) {
  return useQuery({
    queryKey: [PARTIES_KEY, filters],
    queryFn: () => getParties(filters),
  });
}

export function useParty(id: string) {
  return useQuery({
    queryKey: [PARTIES_KEY, id],
    queryFn: () => getParty(id),
    enabled: !!id,
  });
}

export function useCreateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePartyInput) => createParty(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PARTIES_KEY] });
      toast.success('Party created successfully');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create party';
      toast.error(msg);
    },
  });
}

export function useUpdateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePartyInput }) => updateParty(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PARTIES_KEY] });
      toast.success('Party updated successfully');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update party';
      toast.error(msg);
    },
  });
}

export function useDeactivateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateParty(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PARTIES_KEY] });
      toast.success('Party deactivated');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to deactivate party';
      toast.error(msg);
    },
  });
}
