import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePayment } from '../hooks/usePayments';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque', OTHER: 'Other',
};
const TYPE_LABELS: Record<string, string> = {
  SUPPLIER_PAYMENT: 'Pay Supplier', CUSTOMER_PAYMENT: 'Receive from Customer',
};

export function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: payment, isLoading, isError } = usePayment(id ?? '');

  if (isLoading) return <div className="p-8 text-center text-sm text-gray-400">Loading…</div>;
  if (isError || !payment) return <div className="p-8 text-center text-sm text-red-500">Payment not found</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">{payment.paymentNumber}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
            {TYPE_LABELS[payment.paymentType] ?? payment.paymentType}
          </span>
        </div>
        <button onClick={() => navigate('/payments')} className="text-sm text-gray-500 hover:text-gray-900 mt-1">
          ← Back to Payments
        </button>
      </div>

      <div className="bg-white rounded-lg border p-5 space-y-3 text-sm">
        <Row label="Party">
          <Link to={`/parties`} className="text-blue-600 hover:underline">
            {payment.party?.name ?? payment.partyId}
          </Link>
        </Row>
        <Row label="Amount">
          <span className="font-bold text-base">
            {Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </Row>
        <Row label="Method">{METHOD_LABELS[payment.method] ?? payment.method}</Row>
        <Row label="Date">{new Date(payment.paymentDate).toLocaleDateString()}</Row>
        {payment.referenceNumber && <Row label="Reference">{payment.referenceNumber}</Row>}
        {payment.remarks && <Row label="Remarks">{payment.remarks}</Row>}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
        Payments are final and cannot be cancelled. If this was entered incorrectly, record a
        correcting payment to adjust the balance.
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 text-right">{children}</span>
    </div>
  );
}
