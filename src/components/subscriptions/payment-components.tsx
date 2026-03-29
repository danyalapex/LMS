import { PremiumCard, PremiumButton, PremiumBadge, PremiumAlert } from "@/components/ui/premium-components";
import { formatDistanceToNow } from "date-fns";

export interface SubscriptionPayment {
  id: string;
  amount_pkr: number;
  payment_method: "cash" | "bank_transfer" | "cheque";
  status: "pending" | "completed" | "failed";
  reference_no?: string;
  notes?: string;
  due_date: string;
  paid_date?: string;
  created_at: string;
}

export function PaymentMethodBadge({ method }: { method: string }) {
  const icons: Record<string, string> = {
    cash: "💵",
    bank_transfer: "🏦",
    cheque: "📄",
  };

  const colors: Record<string, "primary" | "success" | "warning" | "danger" | "info"> = {
    cash: "success",
    bank_transfer: "info",
    cheque: "warning",
  };

  const labels: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
  };

  return (
    <PremiumBadge variant={colors[method]}>
      {icons[method]} {labels[method]}
    </PremiumBadge>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, "primary" | "success" | "warning" | "danger" | "info"> = {
    pending: "warning",
    completed: "success",
    failed: "danger",
  };

  const labels: Record<string, string> = {
    pending: "Pending",
    completed: "Completed",
    failed: "Failed",
  };

  return <PremiumBadge variant={colors[status]}>{labels[status]}</PremiumBadge>;
}

export function SubscriptionPaymentItem({
  payment,
  onComplete,
}: {
  payment: SubscriptionPayment;
  onComplete?: (id: string) => void;
}) {
  const isOverdue =
    payment.status === "pending" && new Date(payment.due_date) < new Date();

  return (
    <PremiumCard>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div>
              <p className="font-semibold text-slate-900">
                PKR {payment.amount_pkr.toLocaleString("en-PK")}
              </p>
              <p className="text-sm text-slate-500">
                Due {new Date(payment.due_date).toLocaleDateString("en-PK")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <PaymentMethodBadge method={payment.payment_method} />
            <PaymentStatusBadge status={payment.status} />
            {isOverdue && <PremiumBadge variant="danger">⚠️ Overdue</PremiumBadge>}
          </div>

          {payment.reference_no && (
            <p className="text-xs text-slate-500">Ref: {payment.reference_no}</p>
          )}

          {payment.notes && (
            <p className="text-sm text-slate-600 mt-2">{payment.notes}</p>
          )}

          {payment.paid_date && (
            <p className="text-xs text-green-600 mt-2">
              ✓ Paid on {new Date(payment.paid_date).toLocaleDateString("en-PK")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {payment.status === "pending" && onComplete && (
            <PremiumButton
              size="sm"
              variant="primary"
              onClick={() => onComplete(payment.id)}
            >
              Mark Paid
            </PremiumButton>
          )}
        </div>
      </div>
    </PremiumCard>
  );
}

export function SubscriptionPaymentForm({
  onSubmit,
  loading = false,
}: {
  onSubmit: (data: {
    amount: number;
    method: "cash" | "bank_transfer" | "cheque";
    dueDate: string;
    referenceNo?: string;
    notes?: string;
  }) => void;
  loading?: boolean;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    onSubmit({
      amount: Number(formData.get("amount")),
      method: formData.get("method") as any,
      dueDate: formData.get("dueDate") as string,
      referenceNo: formData.get("referenceNo") as string,
      notes: formData.get("notes") as string,
    });
  };

  return (
    <PremiumCard>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Record Payment</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Amount (PKR) *
          </label>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0"
            required
            className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="3000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Payment Method *
          </label>
          <select
            name="method"
            required
            defaultValue="cash"
            className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="cash">💵 Cash Payment</option>
            <option value="bank_transfer">🏦 Bank Transfer</option>
            <option value="cheque">📄 Cheque</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Due Date *
          </label>
          <input
            type="date"
            name="dueDate"
            required
            className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Reference No.
          </label>
          <input
            type="text"
            name="referenceNo"
            className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Bank ref, cheque no, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>

        <PremiumButton
          type="submit"
          variant="primary"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Recording..." : "Record Payment"}
        </PremiumButton>
      </form>
    </PremiumCard>
  );
}

export function PaymentStatisticsCard({
  stats,
}: {
  stats: {
    totalCollected: number;
    totalPending: number;
    totalFailed: number;
    methodBreakdown: {
      cash: number;
      bank_transfer: number;
      cheque: number;
    };
  };
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <PremiumCard>
        <p className="text-sm font-medium text-slate-600">Collected</p>
        <p className="mt-2 text-3xl font-bold text-green-600">
          PKR {stats.totalCollected.toLocaleString("en-PK")}
        </p>
      </PremiumCard>

      <PremiumCard>
        <p className="text-sm font-medium text-slate-600">Pending</p>
        <p className="mt-2 text-3xl font-bold text-amber-600">
          PKR {stats.totalPending.toLocaleString("en-PK")}
        </p>
      </PremiumCard>

      <PremiumCard>
        <p className="text-sm font-medium text-slate-600">Failed</p>
        <p className="mt-2 text-3xl font-bold text-red-600">
          PKR {stats.totalFailed.toLocaleString("en-PK")}
        </p>
      </PremiumCard>
    </div>
  );
}
