import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createVehicleSchema, updateVehicleSchema, type CreateVehicleInput, type UpdateVehicleInput, type Vehicle } from '@scrap-erp/shared-types';
import { useCreateVehicle, useUpdateVehicle } from '../hooks/useVehicles';

type CreateFormValues = z.input<typeof createVehicleSchema>;
type UpdateFormValues = z.input<typeof updateVehicleSchema>;

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50';

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function CreateVehicleForm({ onSuccess }: { onSuccess: () => void }) {
  const mutation = useCreateVehicle();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateFormValues>({ resolver: zodResolver(createVehicleSchema) });
  return (
    <form onSubmit={handleSubmit(async (v) => { await mutation.mutateAsync(v as CreateVehicleInput); onSuccess(); })} className="space-y-4">
      <Field label="Vehicle No" required error={errors.vehicleNo?.message}>
        <input {...register('vehicleNo')} className={inputCls} disabled={mutation.isPending} placeholder="e.g. ABC-123" />
      </Field>
      <Field label="Owner Name">
        <input {...register('ownerName')} className={inputCls} disabled={mutation.isPending} placeholder="Owner name" />
      </Field>
      <Field label="Notes">
        <textarea {...register('notes')} rows={2} className={inputCls} disabled={mutation.isPending} placeholder="Any notes" />
      </Field>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={mutation.isPending} className="bg-gray-900 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {mutation.isPending ? 'Creating…' : 'Create Vehicle'}
        </button>
      </div>
    </form>
  );
}

function EditVehicleForm({ vehicle, onSuccess }: { vehicle: Vehicle; onSuccess: () => void }) {
  const mutation = useUpdateVehicle();
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateVehicleSchema),
    defaultValues: { vehicleNo: vehicle.vehicleNo, ownerName: vehicle.ownerName ?? '', notes: vehicle.notes ?? '' },
  });
  return (
    <form onSubmit={handleSubmit(async (v) => { await mutation.mutateAsync({ id: vehicle.id, data: v as UpdateVehicleInput }); onSuccess(); })} className="space-y-4">
      <Field label="Vehicle No" required error={errors.vehicleNo?.message}>
        <input {...register('vehicleNo')} className={inputCls} disabled={mutation.isPending} />
      </Field>
      <Field label="Owner Name">
        <input {...register('ownerName')} className={inputCls} disabled={mutation.isPending} />
      </Field>
      <Field label="Notes">
        <textarea {...register('notes')} rows={2} className={inputCls} disabled={mutation.isPending} />
      </Field>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={mutation.isPending} className="bg-gray-900 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

type Props = { mode: 'create'; onSuccess: () => void } | { mode: 'edit'; vehicle: Vehicle; onSuccess: () => void };
export function VehicleForm(props: Props) {
  return props.mode === 'edit'
    ? <EditVehicleForm vehicle={props.vehicle} onSuccess={props.onSuccess} />
    : <CreateVehicleForm onSuccess={props.onSuccess} />;
}
