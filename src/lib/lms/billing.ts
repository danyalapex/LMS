export type FeeInvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

type ResolveFeeInvoiceStatusInput = {
  amountDue: number;
  totalPaid: number;
  dueDate: string;
  requestedStatus?: FeeInvoiceStatus;
};

function normalizeAmount(value: number) {
  return Number(value.toFixed(2));
}

export function getFeeInvoiceBalance(amountDue: number, totalPaid: number) {
  return normalizeAmount(amountDue - totalPaid);
}

export function resolveFeeInvoiceStatus({
  amountDue,
  totalPaid,
  dueDate,
  requestedStatus = "issued",
}: ResolveFeeInvoiceStatusInput): FeeInvoiceStatus {
  if (requestedStatus === "cancelled") {
    return "cancelled";
  }

  if (requestedStatus === "draft" && totalPaid <= 0) {
    return "draft";
  }

  if (normalizeAmount(totalPaid) >= normalizeAmount(amountDue)) {
    return "paid";
  }

  if (totalPaid > 0) {
    return "partially_paid";
  }

  if (dueDate < new Date().toISOString().slice(0, 10)) {
    return "overdue";
  }

  return "issued";
}
