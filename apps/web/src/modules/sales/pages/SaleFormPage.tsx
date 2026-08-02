import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSaleSchema } from '@scrap-erp/shared-types';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useCreateSale } from '../hooks/useSales';
import { useParties } from '@/modules/parties/hooks/useParties';
import { useItems } from '@/modules/items/hooks/useItems';
import { useWarehouses } from '@/modules/warehouses/hooks/useWarehouses';
import { SearchableSelect } from '@/components/SearchableSelect';
import type { CreateSaleInput } from '@scrap-erp/shared-types';

type FormValues = z.input<typeof createSaleSchema>;

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50';

function fmt(n: number) {
  return isNaN(n) || !isFinite(n) ? '0.00' : n.toFixed(2);
}

// Hook to fetch live stock for a specific item + warehouse combo
function useItemStock(itemId: string, warehouseId: string) {
  return useQuery({
    queryKey: ['item-stock', itemId, warehouseId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { stock: string } }>(
        `/api/v1/items/${itemId}/stock?warehouseId=${warehouseId}`,
      );
      return Number(res.data.data.stock);
    },
    enabled: !!itemId && !!warehouseId,
    staleTime: 10_000, // refresh stock every 10s
  });
}

export function SaleFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreateSale();

  const { data: partiesData } = useParties({ isCustomer: true, limit: 200 });
  const { data: itemsData } = useItems({ limit: 200 });
  const { data: warehousesData } = useWarehouses();

  const partyOptions = (partiesData?.items ?? []).map((p) => ({
    value: p.id, label: p.name, sub: p.partyCode,
  }));
  const itemOptions = (itemsData?.items ?? []).map((i) => ({
    value: i.id, label: i.name, sub: `${i.itemCode} · ${i.unit}`,
  }));
  const warehouseOptions = (warehousesData ?? []).map((w) => ({
    value: w.id, label: w.name,
  }));

  const today = new Date().toISOString().slice(0, 10);

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(createSaleSchema),
    defaultValues: {
      saleDate: today,
      expenseAmount: 0,
      items: [{ itemId: '', quantity: 0, rate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' });
  const watchedExpense = useWatch({ control, name: 'expenseAmount' });
  const watchedWarehouse = useWatch({ control, name: 'warehouseId' });

  const grossTotal = (watchedItems ?? []).reduce(
    (sum, row) => sum + (row.quantity || 0) * (row.rate || 0), 0,
  );
  const expenseTotal = Number(watchedExpense) || 0;

  const onSubmit = async (values: FormValues) => {
    try {
      const sale = await createMutation.mutateAsync(values as CreateSaleInput);
      toast.success(`Sale ${sale.saleNumber} created`);
      navigate(`/sales/${sale.id}`);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create sale';
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">New Sale</h2>
        <p className="text-sm text-gray-500">Record a sale to a customer</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Header ── */}
        <div className="bg-white rounded-lg border p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Party (Customer) <span className="text-red-500">*</span>
            </label>
            <Controller control={control} name="partyId" render={({ field }) => (
              <SearchableSelect options={partyOptions} value={field.value ?? ''} onChange={field.onChange} placeholder="Select customer…" disabled={createMutation.isPending} />
            )} />
            {errors.partyId && <p className="mt-1 text-xs text-red-600">{errors.partyId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse <span className="text-red-500">*</span>
            </label>
            <Controller control={control} name="warehouseId" render={({ field }) => (
              <SearchableSelect options={warehouseOptions} value={field.value ?? ''} onChange={field.onChange} placeholder="Select warehouse…" disabled={createMutation.isPending} />
            )} />
            {errors.warehouseId && <p className="mt-1 text-xs text-red-600">{errors.warehouseId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sale Date <span className="text-red-500">*</span>
            </label>
            <input {...register('saleDate')} type="date" className={inputCls} disabled={createMutation.isPending} />
            {errors.saleDate && <p className="mt-1 text-xs text-red-600">{errors.saleDate.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expense Amount
              <span className="ml-1 text-xs font-normal text-gray-400">(internal, not billed)</span>
            </label>
            <input {...register('expenseAmount', { valueAsNumber: true })} type="number" step="0.01" min="0" className={inputCls} disabled={createMutation.isPending} placeholder="0.00" />
          </div>
        </div>

        {/* ── Items ── */}
        <div className="bg-white rounded-lg border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Items</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Available stock shown per item once warehouse and item are selected
              </p>
            </div>
            <button type="button" onClick={() => append({ itemId: '', quantity: 0, rate: 0 })} disabled={createMutation.isPending}
              className="text-sm text-gray-700 border border-gray-300 px-3 py-1 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50">
              + Add Item
            </button>
          </div>

          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
            <div className="col-span-3">Item</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Rate</div>
            <div className="col-span-4">Amount</div>
            <div className="col-span-1"></div>
          </div>

          {fields.map((field, idx) => {
            const row = watchedItems?.[idx];
            const rowErr = errors.items?.[idx] ?? {};
            return (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start border-b pb-3 last:border-0 last:pb-0">
                {/* Item select */}
                <div className="col-span-3">
                  <Controller control={control} name={`items.${idx}.itemId`} render={({ field: f }) => (
                    <SearchableSelect options={itemOptions} value={f.value ?? ''} onChange={f.onChange} placeholder="Select item…" disabled={createMutation.isPending} />
                  )} />
                  {(rowErr as { itemId?: { message?: string } }).itemId && <p className="mt-1 text-xs text-red-600">{(rowErr as { itemId?: { message?: string } }).itemId?.message}</p>}

                  {/* Live stock availability */}
                  {row?.itemId && watchedWarehouse && (
                    <StockAvailability
                      itemId={row.itemId}
                      warehouseId={watchedWarehouse}
                      quantity={row.quantity ?? 0}
                    />
                  )}
                </div>

                {/* Quantity */}
                <div className="col-span-2">
                  <input {...register(`items.${idx}.quantity`, { valueAsNumber: true })} type="number" step="0.001" min="0" className={inputCls} disabled={createMutation.isPending} placeholder="0.000" />
                  {(rowErr as { quantity?: { message?: string } }).quantity && <p className="mt-1 text-xs text-red-600">{(rowErr as { quantity?: { message?: string } }).quantity?.message}</p>}
                </div>

                {/* Rate */}
                <div className="col-span-2">
                  <input {...register(`items.${idx}.rate`, { valueAsNumber: true })} type="number" step="0.01" min="0" className={inputCls} disabled={createMutation.isPending} placeholder="0.00" />
                  {(rowErr as { rate?: { message?: string } }).rate && <p className="mt-1 text-xs text-red-600">{(rowErr as { rate?: { message?: string } }).rate?.message}</p>}
                </div>

                {/* Amount */}
                <div className="col-span-4 pt-2 text-sm">
                  <span className="text-gray-500">Amt: </span>
                  <span className="font-medium text-gray-800">{fmt((row?.quantity || 0) * (row?.rate || 0))}</span>
                </div>

                {/* Remove */}
                <div className="col-span-1 pt-1">
                  <button type="button" onClick={() => remove(idx)} disabled={fields.length === 1 || createMutation.isPending}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30 text-lg leading-none" title="Remove row">×</button>
                </div>
              </div>
            );
          })}

          {typeof errors.items?.message === 'string' && (
            <p className="text-xs text-red-600">{errors.items.message}</p>
          )}
        </div>

        {/* ── Totals ── */}
        <div className="bg-gray-50 rounded-lg border p-5">
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex gap-8">
              <span className="text-gray-500">Gross Amount (= Net Amount)</span>
              <span className="font-bold w-28 text-right">{fmt(grossTotal)}</span>
            </div>
            <div className="flex gap-8">
              <span className="text-gray-500">Expense Amount (internal only)</span>
              <span className="font-medium w-28 text-right">{fmt(expenseTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/sales')} className="px-5 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending}
            className="bg-gray-900 text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {createMutation.isPending ? 'Saving…' : 'Save Sale'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Stock availability indicator ────────────────────────────────────────────

function StockAvailability({ itemId, warehouseId, quantity }: {
  itemId: string;
  warehouseId: string;
  quantity: number;
}) {
  const { data: stock, isFetching } = useItemStock(itemId, warehouseId);

  if (isFetching) return <p className="mt-1 text-xs text-gray-400">Checking stock…</p>;
  if (stock === undefined) return null;

  const exceeded = (quantity || 0) > stock;
  return (
    <p className={`mt-1 text-xs font-medium ${exceeded ? 'text-red-600' : 'text-green-600'}`}>
      Available: {stock.toFixed(3)}{exceeded ? ' ⚠ Exceeds available stock' : ' ✓'}
    </p>
  );
}
