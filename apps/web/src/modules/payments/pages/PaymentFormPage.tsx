import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createPaymentSchema } from '@scrap-erp/shared-types';
import { toast } from 'sonner';
import { useCreatePayment, usePartyBalance } from '../hooks/usePayments';
import { useParties } from '@/modules/parties/hooks/useParties';
import { SearchableSelect } from '@/components/SearchableSelect';
import type { CreatePaymentInput } from '@scrap-erp/shared-types';

type FormValues = z.input<typeof createPaymentSchema>;

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50';

function BalancePreview({ partyId }: { partyId: string }) {
  const { data, isFetching } = usePartyBalance(partyId);
  if (!partyId) return null;
  if (isFetching) return <p className="text-xs text-gray-400 mt-1">Loading balance…</p>;
  const bal = Number(data?.balance ?? 0);
  const isCredit = bal > 0;
  const isDebit = bal < 0;
  return (
    <p className={`text-xs mt-1 font-medium ${isCredit ? 'text-orange-600' : isDebit ? 'text-blue-600' : 'text-gray-500'}`}>
      Current balance: {bal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      {isCredit ? ' (we owe them)' : isDebit ? ' (they owe us)' : ' (settled)'}
    </p>
  );
}

export function PaymentFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreatePayment();

  const { data: suppliersData } = useParties({ isSupplier: true, limit: 200 });
  const { data: customersData } = useParties({ isCustomer: true, limit: 200 });

  const supplierOptions = (suppliersData?.items ?? []).map((p) => ({
    value: p.id, label: p.name, sub: p.partyCode,
  }));
  const customerOptions = (customersData?.items ?? []).map((p) => ({
    value: p.id, label: p.name, sub: p.partyCode,
  }));

  const today = new Date().toISOString().slice(0, 10);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: { paymentType: 'SUPPLIER_PAYMENT', paymentDate: today },
  });

  const watchedPartyId = watch('partyId');
  const watchedType = watch('paymentType');

  // When paymentType changes, clear partyId since supplier/customer lists differ
  const handleTypeChange = (val: 'SUPPLIER_PAYMENT' | 'CUSTOMER_PAYMENT') => {
    setValue('paymentType', val);
    setValue('partyId', '');
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payment = await createMutation.mutateAsync(values as CreatePaymentInput);
      toast.success(`Payment ${payment.paymentNumber} recorded`);
      navigate(`/payments/${payment.id}`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to record payment';
      toast.error(msg);
    }
  };

  const partyOptions = watchedType === 'SUPPLIER_PAYMENT' ? supplierOptions : customerOptions;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
        <p className="text-sm text-gray-500">Record money received or paid out</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white rounded-lg border p-6">
        {/* Payment Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type <span className="text-red-500">*</span></label>
          <div className="flex gap-4">
            {(['SUPPLIER_PAYMENT', 'CUSTOMER_PAYMENT'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={watchedType === t} onChange={() => handleTypeChange(t)}
                  className="accent-gray-900" disabled={createMutation.isPending} />
                {t === 'SUPPLIER_PAYMENT' ? 'Pay Supplier' : 'Receive from Customer'}
              </label>
            ))}
          </div>
        </div>

        {/* Party */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {watchedType === 'SUPPLIER_PAYMENT' ? 'Supplier' : 'Customer'} <span className="text-red-500">*</span>
          </label>
          <Controller control={control} name="partyId" render={({ field }) => (
            <SearchableSelect
              options={partyOptions}
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder={`Select ${watchedType === 'SUPPLIER_PAYMENT' ? 'supplier' : 'customer'}…`}
              disabled={createMutation.isPending}
            />
          )} />
          {errors.partyId && <p className="mt-1 text-xs text-red-600">{errors.partyId.message}</p>}
          {watchedPartyId && <BalancePreview partyId={watchedPartyId} />}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount <span className="text-red-500">*</span></label>
          <input {...register('amount', { valueAsNumber: true })} type="number" step="0.01" min="0.01"
            className={inputCls} disabled={createMutation.isPending} placeholder="0.00" />
          {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
        </div>

        {/* Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Method <span className="text-red-500">*</span></label>
          <select {...register('method')} className={inputCls} disabled={createMutation.isPending}>
            <option value="">Select method…</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
          </select>
          {errors.method && <p className="mt-1 text-xs text-red-600">{errors.method.message}</p>}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date <span className="text-red-500">*</span></label>
          <input {...register('paymentDate')} type="date" className={inputCls} disabled={createMutation.isPending} />
          {errors.paymentDate && <p className="mt-1 text-xs text-red-600">{errors.paymentDate.message}</p>}
        </div>

        {/* Reference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
          <input {...register('referenceNumber')} className={inputCls} disabled={createMutation.isPending} placeholder="Cheque no, transaction ID…" />
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea {...register('remarks')} rows={2} className={inputCls} disabled={createMutation.isPending} placeholder="Optional notes" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/payments')} className="px-5 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={createMutation.isPending}
            className="bg-gray-900 text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {createMutation.isPending ? 'Recording…' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}
