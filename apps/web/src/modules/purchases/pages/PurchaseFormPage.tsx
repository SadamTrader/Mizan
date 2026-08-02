import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createPurchaseSchema } from '@scrap-erp/shared-types';
import { toast } from 'sonner';
import { useCreatePurchase } from '../hooks/usePurchases';
import { useParties } from '@/modules/parties/hooks/useParties';
import { useItems } from '@/modules/items/hooks/useItems';
import { useWarehouses } from '@/modules/warehouses/hooks/useWarehouses';
import { useVehicles } from '@/modules/vehicles/hooks/useVehicles';
import { SearchableSelect } from '@/components/SearchableSelect';
import type { CreatePurchaseInput } from '@scrap-erp/shared-types';

type FormValues = z.input<typeof createPurchaseSchema>;

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50';

function fmt(n: number) {
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

// Live row calculations (display only — backend recalculates authoritatively)
function RowCalc({ grossWeight, cutWeight, rate }: { grossWeight: number; cutWeight: number; rate: number }) {
  const net = Math.max(0, (grossWeight || 0) - (cutWeight || 0));
  const amount = net * (rate || 0);
  return (
    <div className="grid grid-cols-2 gap-2 mt-1">
      <div className="text-xs text-gray-500">Net: <span className="font-medium text-gray-800">{fmt(net)}</span></div>
      <div className="text-xs text-gray-500">Amount: <span className="font-medium text-gray-800">{fmt(amount)}</span></div>
    </div>
  );
}

export function PurchaseFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreatePurchase();

  // Data for selects
  const { data: partiesData } = useParties({ isSupplier: true, limit: 200 });
  const { data: itemsData } = useItems({ limit: 200 });
  const { data: warehousesData } = useWarehouses();
  const { data: vehiclesData } = useVehicles({ limit: 200 });

  const partyOptions = (partiesData?.items ?? []).map((p) => ({
    value: p.id,
    label: p.name,
    sub: p.partyCode,
  }));
  const itemOptions = (itemsData?.items ?? []).map((i) => ({
    value: i.id,
    label: i.name,
    sub: `${i.itemCode} · ${i.unit}`,
  }));
  const warehouseOptions = (warehousesData ?? []).map((w) => ({
    value: w.id,
    label: w.name,
  }));
  const vehicleOptions = (vehiclesData?.items ?? []).map((v) => ({
    value: v.id,
    label: v.vehicleNo,
    sub: v.ownerName ?? undefined,
  }));

  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      purchaseDate: today,
      expenseAmount: 0,
      items: [{ itemId: '', grossWeight: 0, cutWeight: 0, rate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Watch items for live totals
  const watchedItems = useWatch({ control, name: 'items' });
  const watchedExpense = useWatch({ control, name: 'expenseAmount' });

  const grossTotal = (watchedItems ?? []).reduce((sum, row) => {
    const net = Math.max(0, (row.grossWeight || 0) - (row.cutWeight || 0));
    return sum + net * (row.rate || 0);
  }, 0);
  const expenseTotal = Number(watchedExpense) || 0;
  const netTotal = grossTotal + expenseTotal;

  const onSubmit = async (values: FormValues) => {
    try {
      const purchase = await createMutation.mutateAsync(values as CreatePurchaseInput);
      toast.success(`Purchase ${purchase.purchaseNumber} created`);
      navigate(`/purchases/${purchase.id}`);
    } catch {
      // error toast handled in mutation onError
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">New Purchase</h2>
        <p className="text-sm text-gray-500">Record a purchase from a supplier</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Header fields ── */}
        <div className="bg-white rounded-lg border p-5 grid grid-cols-2 gap-4">
          {/* Party */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Party (Supplier) <span className="text-red-500">*</span>
            </label>
            <Controller
              control={control}
              name="partyId"
              render={({ field }) => (
                <SearchableSelect
                  options={partyOptions}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Select supplier…"
                  disabled={createMutation.isPending}
                />
              )}
            />
            {errors.partyId && <p className="mt-1 text-xs text-red-600">{errors.partyId.message}</p>}
          </div>

          {/* Warehouse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse <span className="text-red-500">*</span>
            </label>
            <Controller
              control={control}
              name="warehouseId"
              render={({ field }) => (
                <SearchableSelect
                  options={warehouseOptions}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Select warehouse…"
                  disabled={createMutation.isPending}
                />
              )}
            />
            {errors.warehouseId && <p className="mt-1 text-xs text-red-600">{errors.warehouseId.message}</p>}
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Date <span className="text-red-500">*</span>
            </label>
            <input
              {...register('purchaseDate')}
              type="date"
              className={inputCls}
              disabled={createMutation.isPending}
            />
            {errors.purchaseDate && <p className="mt-1 text-xs text-red-600">{errors.purchaseDate.message}</p>}
          </div>

          {/* Vehicle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle (optional)</label>
            <Controller
              control={control}
              name="vehicleId"
              render={({ field }) => (
                <SearchableSelect
                  options={vehicleOptions}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v || undefined)}
                  placeholder="Select vehicle…"
                  disabled={createMutation.isPending}
                />
              )}
            />
          </div>

          {/* Expense Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Amount</label>
            <input
              {...register('expenseAmount', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className={inputCls}
              disabled={createMutation.isPending}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* ── Item rows ── */}
        <div className="bg-white rounded-lg border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Items</h3>
            <button
              type="button"
              onClick={() => append({ itemId: '', grossWeight: 0, cutWeight: 0, rate: 0 })}
              disabled={createMutation.isPending}
              className="text-sm text-gray-700 border border-gray-300 px-3 py-1 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              + Add Item
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
            <div className="col-span-3">Item</div>
            <div className="col-span-2">Gross Wt</div>
            <div className="col-span-2">Cut Wt</div>
            <div className="col-span-2">Rate</div>
            <div className="col-span-2">Net / Amt</div>
            <div className="col-span-1"></div>
          </div>

          {fields.map((field, idx) => {
            const row = watchedItems?.[idx];
            const rowErr = errors.items?.[idx];
            return (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start border-b pb-3 last:border-0 last:pb-0">
                {/* Item select */}
                <div className="col-span-3">
                  <Controller
                    control={control}
                    name={`items.${idx}.itemId`}
                    render={({ field: f }) => (
                      <SearchableSelect
                        options={itemOptions}
                        value={f.value ?? ''}
                        onChange={f.onChange}
                        placeholder="Select item…"
                        disabled={createMutation.isPending}
                      />
                    )}
                  />
                  {rowErr?.itemId && <p className="mt-1 text-xs text-red-600">{rowErr.itemId.message}</p>}
                </div>

                {/* Gross Weight */}
                <div className="col-span-2">
                  <input
                    {...register(`items.${idx}.grossWeight`, { valueAsNumber: true })}
                    type="number" step="0.001" min="0"
                    className={inputCls}
                    disabled={createMutation.isPending}
                    placeholder="0.000"
                  />
                  {rowErr?.grossWeight && <p className="mt-1 text-xs text-red-600">{rowErr.grossWeight.message}</p>}
                </div>

                {/* Cut Weight */}
                <div className="col-span-2">
                  <input
                    {...register(`items.${idx}.cutWeight`, { valueAsNumber: true })}
                    type="number" step="0.001" min="0"
                    className={inputCls}
                    disabled={createMutation.isPending}
                    placeholder="0.000"
                  />
                  {rowErr?.cutWeight && <p className="mt-1 text-xs text-red-600">{rowErr.cutWeight.message}</p>}
                </div>

                {/* Rate */}
                <div className="col-span-2">
                  <input
                    {...register(`items.${idx}.rate`, { valueAsNumber: true })}
                    type="number" step="0.01" min="0"
                    className={inputCls}
                    disabled={createMutation.isPending}
                    placeholder="0.00"
                  />
                  {rowErr?.rate && <p className="mt-1 text-xs text-red-600">{rowErr.rate.message}</p>}
                </div>

                {/* Live calc (display only) */}
                <div className="col-span-2 pt-2">
                  <RowCalc
                    grossWeight={row?.grossWeight ?? 0}
                    cutWeight={row?.cutWeight ?? 0}
                    rate={row?.rate ?? 0}
                  />
                </div>

                {/* Remove */}
                <div className="col-span-1 pt-1">
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    disabled={fields.length === 1 || createMutation.isPending}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30 text-lg leading-none"
                    title="Remove row"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}

          {errors.items?.root && (
            <p className="text-xs text-red-600">{errors.items.root.message}</p>
          )}
          {/* Schema-level refinement error (cutWeight >= grossWeight) */}
          {typeof errors.items?.message === 'string' && (
            <p className="text-xs text-red-600">{errors.items.message}</p>
          )}
        </div>

        {/* ── Totals ── */}
        <div className="bg-gray-50 rounded-lg border p-5">
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex gap-8">
              <span className="text-gray-500">Gross Amount</span>
              <span className="font-medium w-28 text-right">{fmt(grossTotal)}</span>
            </div>
            <div className="flex gap-8">
              <span className="text-gray-500">Expense Amount</span>
              <span className="font-medium w-28 text-right">{fmt(expenseTotal)}</span>
            </div>
            <div className="flex gap-8 text-base font-bold border-t pt-2 mt-1">
              <span>Net Amount</span>
              <span className="w-28 text-right">{fmt(netTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="px-5 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-gray-900 text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? 'Saving…' : 'Save Purchase'}
          </button>
        </div>
      </form>
    </div>
  );
}
