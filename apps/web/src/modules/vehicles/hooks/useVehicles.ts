import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getVehicles, getVehicle, createVehicle, updateVehicle, deactivateVehicle, type VehiclesFilters } from '../services/vehicles.service';
import type { CreateVehicleInput, UpdateVehicleInput } from '@scrap-erp/shared-types';

export const VEHICLES_KEY = 'vehicles';

type ApiErr = { response?: { data?: { message?: string } } };
const errMsg = (e: unknown, fallback: string) => (e as ApiErr)?.response?.data?.message ?? fallback;

export function useVehicles(filters: VehiclesFilters = {}) {
  return useQuery({ queryKey: [VEHICLES_KEY, filters], queryFn: () => getVehicles(filters) });
}

export function useVehicle(id: string) {
  return useQuery({ queryKey: [VEHICLES_KEY, id], queryFn: () => getVehicle(id), enabled: !!id });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVehicleInput) => createVehicle(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [VEHICLES_KEY] }); toast.success('Vehicle created'); },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to create vehicle')),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehicleInput }) => updateVehicle(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [VEHICLES_KEY] }); toast.success('Vehicle updated'); },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to update vehicle')),
  });
}

export function useDeactivateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateVehicle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [VEHICLES_KEY] }); toast.success('Vehicle deactivated'); },
    onError: (e: unknown) => toast.error(errMsg(e, 'Failed to deactivate vehicle')),
  });
}
