import type { Party } from '@scrap-erp/shared-types';
import { useAuthStore } from '@/store/auth.store';
import { useDeactivateParty } from '../hooks/useParties';

type Props = {
  party: Party;
  onClose: () => void;
  onEdit: () => void;
};

export function PartyDetailDrawer({ party, onClose, onEdit }: Props) {
  const role = useAuthStore((s) => s.user?.role);
  const deactivate = useDeactivateParty();

  const handleDeactivate = async () => {
    if (!confirm(`Deactivate "${party.name}"? They will be hidden from new transactions.`)) return;
    await deactivate.mutateAsync(party.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">{party.name}</h2>
            <p className="text-xs text-gray-500">{party.partyCode}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
          {/* Info */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Details
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Type</dt>
                <dd className="flex gap-1">
                  {party.isSupplier && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Supplier</span>
                  )}
                  {party.isCustomer && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Customer</span>
                  )}
                </dd>
              </div>
              {party.phone && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="text-gray-900">{party.phone}</dd>
                </div>
              )}
              {party.address && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Address</dt>
                  <dd className="text-gray-900 text-right max-w-48">{party.address}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Balance</dt>
                {/* NOTE: This shows openingBalance only for now.
                    Starting Part 10, this will be replaced with a live
                    ledger balance calculated from LedgerEntry records. */}
                <dd className="font-medium text-gray-900">
                  {Number(party.openingBalance).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </dd>
              </div>
            </dl>
          </section>

          {/* Placeholder sections */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Recent Purchases
            </h3>
            <p className="text-xs text-gray-400 italic">Available after Part 8</p>
          </section>
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Recent Sales
            </h3>
            <p className="text-xs text-gray-400 italic">Available after Part 9</p>
          </section>
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Recent Payments
            </h3>
            <p className="text-xs text-gray-400 italic">Available after Part 10</p>
          </section>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="text-sm px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            {role === 'ADMIN' && (
              <button
                onClick={handleDeactivate}
                disabled={deactivate.isPending}
                className="text-sm px-4 py-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {deactivate.isPending ? 'Deactivating…' : 'Deactivate'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
