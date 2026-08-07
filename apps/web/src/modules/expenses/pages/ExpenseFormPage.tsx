import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createExpenseSchema } from '@scrap-erp/shared-types';
import { useCreateExpense, useUpdateExpense, useExpense } from '../hooks/useExpenses';
import type { CreateExpenseInput, UpdateExpenseInput } from '@scrap-erp/shared-types';

type FormValues = z.input<typeof createExpenseSchema>;

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50';

const CATEGORIES = ['RENT', 'SALARY', 'FUEL', 'UTILITIES', 'MAINTENANCE', 'OTHER'] as const;
const METHODS = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'] as const;
const CAT_LABELS: Record<string, string> = { RENT: 'Rent', SALARY: 'Salary', FUEL: 'Fuel', UTILITIES: 'Utilities', MAINTENANCE: 'Maintenance', OTHER: 'Other' };
const METHOD_LABELS: Record<string, string> = { CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque', OTHER: 'Other' };

function ExpenseForm({ initialValues, onSubmit, isPending, isEdit }: {
  initialValues: FormValues;
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
  isEdit: boolean;
}) {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: initialValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
        <select {...register('category')} className={inputCls} disabled={isPending}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
        </select>
        {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount <span className="text-red-500">*</span></label>
        <input {...register('amount', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className={inputCls} disabled={isPending} placeholder="0.00" />
        {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
        <input {...register('description')} className={inputCls} disabled={isPending} placeholder="What is this expense for?" />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
        <input {...register('expenseDate')} type="date" className={inputCls} disabled={isPending} />
        {errors.expenseDate && <p className="mt-1 text-xs text-red-600">{errors.expenseDate.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method <span className="text-red-500">*</span></label>
        <select {...register('paymentMethod')} className={inputCls} disabled={isPending}>
          {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
        </select>
        {errors.paymentMethod && <p className="mt-1 text-xs text-red-600">{errors.paymentMethod.message}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => navigate('/expenses')} className="px-5 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isPending} className="bg-gray-900 text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Record Expense'}
        </button>
      </div>
    </form>
  );
}

export function ExpenseFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { data: existing, isLoading } = useExpense(id ?? '');
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (values: FormValues) => {
    if (isEdit && id) {
      await updateMutation.mutateAsync({ id, data: values as UpdateExpenseInput });
    } else {
      await createMutation.mutateAsync(values as CreateExpenseInput);
    }
    navigate('/expenses');
  };

  if (isEdit && isLoading) return <div className="p-8 text-center text-sm text-gray-400">Loading…</div>;
  if (isEdit && !existing) return <div className="p-8 text-center text-sm text-red-500">Expense not found</div>;

  const initialValues: FormValues = existing
    ? {
        category: existing.category,
        amount: Number(existing.amount),
        description: existing.description,
        expenseDate: existing.expenseDate.slice(0, 10),
        paymentMethod: existing.paymentMethod,
      }
    : {
        category: 'OTHER',
        amount: 0,
        description: '',
        expenseDate: today,
        paymentMethod: 'CASH',
      };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <button onClick={() => navigate('/expenses')} className="text-sm text-gray-500 hover:text-gray-900 mb-2 block">← Back to Expenses</button>
        <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Expense' : 'Record Expense'}</h2>
      </div>
      <ExpenseForm initialValues={initialValues} onSubmit={handleSubmit} isPending={isPending} isEdit={isEdit} />
    </div>
  );
}
