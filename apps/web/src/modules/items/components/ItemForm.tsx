import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createItemSchema, updateItemSchema, type CreateItemInput, type UpdateItemInput, type ScrapItem } from '@scrap-erp/shared-types';
import { useCreateItem, useUpdateItem } from '../hooks/useItems';

type CreateFormValues = z.input<typeof createItemSchema>;
type UpdateFormValues = z.input<typeof updateItemSchema>;

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50';

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function CreateItemForm({ onSuccess }: { onSuccess: () => void }) {
  const mutation = useCreateItem();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateFormValues>({
    resolver: zodResolver(createItemSchema),
  });
  return (
    <form onSubmit={handleSubmit(async (v) => { await mutation.mutateAsync(v as CreateItemInput); onSuccess(); })} className="space-y-4">
      <Field label="Name" required error={errors.name?.message}>
        <input {...register('name')} className={inputCls} disabled={mutation.isPending} placeholder="e.g. Iron Scrap" />
      </Field>
      <Field label="Category" error={errors.category?.message}>
        <input {...register('category')} className={inputCls} disabled={mutation.isPending} placeholder="e.g. Ferrous" />
      </Field>
      <Field label="Unit" required error={errors.unit?.message}>
        <select {...register('unit')} className={inputCls} disabled={mutation.isPending}>
          <option value="">Select unit…</option>
          <option value="KG">KG</option>
          <option value="TON">TON</option>
        </select>
      </Field>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={mutation.isPending} className="bg-gray-900 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {mutation.isPending ? 'Creating…' : 'Create Item'}
        </button>
      </div>
    </form>
  );
}

function EditItemForm({ item, onSuccess }: { item: ScrapItem; onSuccess: () => void }) {
  const mutation = useUpdateItem();
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateItemSchema),
    defaultValues: { name: item.name, category: item.category ?? '', unit: item.unit },
  });
  return (
    <form onSubmit={handleSubmit(async (v) => { await mutation.mutateAsync({ id: item.id, data: v as UpdateItemInput }); onSuccess(); })} className="space-y-4">
      <Field label="Name" required error={errors.name?.message}>
        <input {...register('name')} className={inputCls} disabled={mutation.isPending} />
      </Field>
      <Field label="Category">
        <input {...register('category')} className={inputCls} disabled={mutation.isPending} />
      </Field>
      <Field label="Unit" error={errors.unit?.message}>
        <select {...register('unit')} className={inputCls} disabled={mutation.isPending}>
          <option value="KG">KG</option>
          <option value="TON">TON</option>
        </select>
      </Field>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={mutation.isPending} className="bg-gray-900 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

type Props = { mode: 'create'; onSuccess: () => void } | { mode: 'edit'; item: ScrapItem; onSuccess: () => void };
export function ItemForm(props: Props) {
  return props.mode === 'edit'
    ? <EditItemForm item={props.item} onSuccess={props.onSuccess} />
    : <CreateItemForm onSuccess={props.onSuccess} />;
}
