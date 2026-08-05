import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useWarehouses } from '@/modules/warehouses/hooks/useWarehouses';
import { useItems } from '@/modules/items/hooks/useItems';
import { SearchableSelect } from '@/components/SearchableSelect';
import { useCreateAdjustment } from '../hooks/useInventory';

const schema = z.object({
  itemId: z.string().uuid('Select an item'),
  warehouseId: z.string().uuid('Select a warehouse'),
  quantity: z.number().refine((v) => v !== 0, 'Quantity cannot be zero'),
  reason: z.string().min(1, 'Reason is required'),
});

type FormValues = z.infer<typeof schema>;

function CurrentStock({ itemId, warehouseId }: { itemId: string; warehouseId: string }) {
  const { data, isFetching } = useQuery({
    queryKey: ['item-stock', itemId, warehouseId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { stock: string } }>(
        `/api/v1/items/${itemId}/stock?warehouseId=${warehouseId}`,
      );
      return Number(res.data.data.stock);
    },
    enabled: !!itemId && !!warehouseId,
    staleTime: 5_000,
  });

  if (!itemId || !warehouseId) return null;
  if (isFetching) return <p className="text-xs text-gray-400 mt-1">Loading stock…</p>;
  return (
    <p className="text-xs font-medium text-gray-600 mt-1">
      Current stock: <span className="text-gray-900">{data?.toFixed(3) ?? '—'}</span>
    </p>
  );
}

export function ManualAdjustmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mutation = useCreateAdjustment();

  const { data: warehousesData } = useWarehouses();
  const { data: itemsData } = useItems({ limit: 200 });

  const warehouseOptions = (warehousesData ?? []).map((w) => ({ value: w.id, label: w.name }));
  const itemOptions = (itemsData?.items ?? []).map((i) => ({
    value: i.id, label: i.name, sub: `${i.itemCode} · ${i.unit}`,
  }));

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemId: searchParams.get('itemId') ?? '',
      warehouseId: searchParams.get('warehouseId') ?? '',
    },
  });

  const watchedItem = watch('itemId');
  const watchedWarehouse = watch('warehouseId');

  const onSubmit = async (values: FormValues) => {
    try {
      await mutation.mutateAsync(values);
      navigate('/inventory');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to record adjustment';
      toast.error(msg);
    }
  };

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50';

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <button onClick={() => navigate('/inventory')} className="text-sm text-gray-500 hover:text-gray-900 mb-2 block">
          ← Back to Inventory
        </button>
        <h2 className="text-xl font-bold text-gray-900">Manual Stock Adjustment</h2>
        <p className="text-sm text-gray-500">Positive quantity = stock in, negative = stock out</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-5">
        {/* Item */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item <span className="text-red-500">*</span></label>
          <Controller control={control} name="itemId" render={({ field }) => (
            <SearchableSelect options={itemOptions} value={field.value ?? ''} onChange={field.onChange}
              placeholder="Select item…" disabled={mutation.isPending} />
          )} />
          {errors.itemId && <p className="mt-1 text-xs text-red-600">{errors.itemId.message}</p>}
        </div>

        {/* Warehouse */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse <span className="text-red-500">*</span></label>
          <Controller control={control} name="warehouseId" render={({ field }) => (
            <SearchableSelect options={warehouseOptions} value={field.value ?? ''} onChange={field.onChange}
              placeholder="Select warehouse…" disabled={mutation.isPending} />
          )} />
          {errors.warehouseId && <p className="mt-1 text-xs text-red-600">{errors.warehouseId.message}</p>}
          {/* Live stock display */}
          {watchedItem && watchedWarehouse && (
            <CurrentStock itemId={watchedItem} warehouseId={watchedWarehouse} />
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity <span className="text-red-500">*</span>
            <span className="ml-1 text-xs font-normal text-gray-400">(positive = add, negative = remove)</span>
          </label>
          <input {...register('quantity', { valueAsNumber: true })} type="number" step="0.001"
            className={inputCls} disabled={mutation.isPending} placeholder="e.g. 10 or -5" />
          {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
          <textarea {...register('reason')} rows={2} className={inputCls} disabled={mutation.isPending}
            placeholder="e.g. Stocktake correction, Damaged goods written off" />
          {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/inventory')}
            className="px-5 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending}
            className="bg-gray-900 text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {mutation.isPending ? 'Saving…' : 'Record Adjustment'}
          </button>
        </div>
      </form>
    </div>
  );
}
