import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createPartySchema,
  updatePartySchema,
  type CreatePartyInput,
  type UpdatePartyInput,
  type Party,
} from '@scrap-erp/shared-types';
import { z } from 'zod';
import { useCreateParty, useUpdateParty } from '../hooks/useParties';

// RHF form input types (what the form fields hold — defaults may be undefined before user input)
type CreateFormValues = z.input<typeof createPartySchema>;
type UpdateFormValues = z.input<typeof updatePartySchema>;

// ─── Shared field UI ──────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50';

// ─── Create form ──────────────────────────────────────────────────────────────

function CreatePartyForm({ onSuccess }: { onSuccess: () => void }) {
  const mutation = useCreateParty();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateFormValues>({
    resolver: zodResolver(createPartySchema),
    defaultValues: { isSupplier: false, isCustomer: false, openingBalance: 0 },
  });

  return (
    <form onSubmit={handleSubmit(async (v) => { await mutation.mutateAsync(v as CreatePartyInput); onSuccess(); })} className="space-y-4">
      <Field label="Name" required error={errors.name?.message}>
        <input {...register('name')} className={inputCls} disabled={mutation.isPending} placeholder="Party name" />
      </Field>
      <Field label="Phone" error={errors.phone?.message}>
        <input {...register('phone')} className={inputCls} disabled={mutation.isPending} placeholder="Phone number" />
      </Field>
      <Field label="Address">
        <textarea {...register('address')} rows={2} className={inputCls} disabled={mutation.isPending} placeholder="Address" />
      </Field>
      <Field label="Opening Balance" error={errors.openingBalance?.message}>
        <input {...register('openingBalance', { valueAsNumber: true })} type="number" step="0.01" className={inputCls} disabled={mutation.isPending} placeholder="0.00" />
        <p className="mt-1 text-xs text-gray-400">Cannot be changed after creation</p>
      </Field>
      <Field label="Type" required error={errors.isSupplier?.message}>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm"><input {...register('isSupplier')} type="checkbox" className="rounded border-gray-300" disabled={mutation.isPending} /> Supplier</label>
          <label className="flex items-center gap-2 text-sm"><input {...register('isCustomer')} type="checkbox" className="rounded border-gray-300" disabled={mutation.isPending} /> Customer</label>
        </div>
      </Field>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={mutation.isPending} className="bg-gray-900 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {mutation.isPending ? 'Creating…' : 'Create Party'}
        </button>
      </div>
    </form>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditPartyForm({ party, onSuccess }: { party: Party; onSuccess: () => void }) {
  const mutation = useUpdateParty();
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateFormValues>({
    resolver: zodResolver(updatePartySchema),
    defaultValues: {
      name: party.name,
      phone: party.phone ?? '',
      address: party.address ?? '',
      isSupplier: party.isSupplier,
      isCustomer: party.isCustomer,
    },
  });

  return (
    <form onSubmit={handleSubmit(async (v) => { await mutation.mutateAsync({ id: party.id, data: v as UpdatePartyInput }); onSuccess(); })} className="space-y-4">
      <Field label="Name" required error={errors.name?.message}>
        <input {...register('name')} className={inputCls} disabled={mutation.isPending} />
      </Field>
      <Field label="Phone">
        <input {...register('phone')} className={inputCls} disabled={mutation.isPending} />
      </Field>
      <Field label="Address">
        <textarea {...register('address')} rows={2} className={inputCls} disabled={mutation.isPending} />
      </Field>
      <Field label="Type" required error={errors.isSupplier?.message}>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm"><input {...register('isSupplier')} type="checkbox" className="rounded border-gray-300" disabled={mutation.isPending} /> Supplier</label>
          <label className="flex items-center gap-2 text-sm"><input {...register('isCustomer')} type="checkbox" className="rounded border-gray-300" disabled={mutation.isPending} /> Customer</label>
        </div>
      </Field>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={mutation.isPending} className="bg-gray-900 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

type Props =
  | { mode: 'create'; onSuccess: () => void }
  | { mode: 'edit'; party: Party; onSuccess: () => void };

export function PartyForm(props: Props) {
  if (props.mode === 'edit') {
    return <EditPartyForm party={props.party} onSuccess={props.onSuccess} />;
  }
  return <CreatePartyForm onSuccess={props.onSuccess} />;
}
