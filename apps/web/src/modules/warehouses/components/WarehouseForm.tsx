import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createWarehouseSchema, updateWarehouseSchema, type CreateWarehouseInput, type UpdateWarehouseInput, type Warehouse } from '@scrap-erp/shared-types';
import { useCreateWarehouse, useUpdateWarehouse } from '../hooks/useWarehouses';

type CreateFormValues = z.input<typeof createWarehouseSchema>;
type UpdateFormValues = z.input<typeof updateWarehouseSchema>;

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

function CreateWarehouseForm({ onSuccess }: { onSuccess: () => void }) {
  const mutation = useCreateWarehouse();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateFormValues>({ resolver: zodResolver(createWarehouseSchema) });
  return (
    <form onSubmit={handleSubmit(async (v) => { await mutation.mutateAsync(v as CreateWarehouseInput); onSuccess(); })} className="space-y-4">
      <Field label="Name" required error={errors.name?.message}>
        <input {...register('name')} className={inputCls} disabled={mutation.isPending} placeholder="e.g. Main Yard" />
      </Field>
      <Field label="Address">
        <textarea {...register('address')} rows={2} className={inputCls} disabled={mutation.isPending} placeholder="Address" />
      </Field>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={mutation.isPending} className="bg-gray-900 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {mutation.isPending ? 'Creating…' : 'Create Warehouse'}
        </button>
      </div>
    </form>
  );
}

function EditWarehouseForm({ warehouse, onSuccess }: { warehouse: Warehouse; onSuccess: () => void }) {
  const mutation = useUpdateWarehouse();
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateWarehouseSchema),
    defaultValues: { name: warehouse.name, address: warehouse.address ?? '' },
  });
  return (
    <form onSubmit={handleSubmit(async (v) => { await mutation.mutateAsync({ id: warehouse.id, data: v as UpdateWarehouseInput }); onSuccess(); })} className="space-y-4">
      <Field label="Name" required error={errors.name?.message}>
        <input {...register('name')} className={inputCls} disabled={mutation.isPending} />
      </Field>
      <Field label="Address">
        <textarea {...register('address')} rows={2} className={inputCls} disabled={mutation.isPending} />
      </Field>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={mutation.isPending} className="bg-gray-900 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

type Props = { mode: 'create'; onSuccess: () => void } | { mode: 'edit'; warehouse: Warehouse; onSuccess: () => void };
export function WarehouseForm(props: Props) {
  return props.mode === 'edit'
    ? <EditWarehouseForm warehouse={props.warehouse} onSuccess={props.onSuccess} />
    : <CreateWarehouseForm onSuccess={props.onSuccess} />;
}
