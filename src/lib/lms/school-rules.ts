type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
} | null | undefined;

export const DEFAULT_FEE_SETTINGS = {
  currency_code: "PKR",
  allow_partial_payments: true,
  late_fee_grace_days: 0,
  late_fee_flat_amount: 0,
  receipt_prefix: "RCPT",
} as const;

export const DEFAULT_PAYMENT_METHOD_TEMPLATES = [
  {
    method_code: "cash",
    label: "Cash",
    instructions: "Record cash collected at front desk or finance office.",
    sort_order: 1,
  },
  {
    method_code: "bank_transfer",
    label: "Bank transfer",
    instructions: "Collect transfer slip or bank reference before approval.",
    sort_order: 2,
  },
  {
    method_code: "card",
    label: "Card",
    instructions: "Use for POS or school office card collections.",
    sort_order: 3,
  },
  {
    method_code: "online",
    label: "Online payment",
    instructions: "Use for gateway or wallet-based school collections.",
    sort_order: 4,
  },
] as const;

export function isMissingRelationError(error: PostgrestLikeError) {
  if (!error) {
    return false;
  }

  if (error.code === "PGRST205" || error.code === "42P01") {
    return true;
  }

  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("could not find the table") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

export function createDefaultOrganizationFeeSettings(organizationId: string) {
  return {
    id: "",
    organization_id: organizationId,
    ...DEFAULT_FEE_SETTINGS,
  };
}

export function createDefaultOrganizationPaymentMethods(organizationId: string) {
  return DEFAULT_PAYMENT_METHOD_TEMPLATES.map((method) => ({
    id: "",
    organization_id: organizationId,
    method_code: method.method_code,
    label: method.label,
    instructions: method.instructions,
    enabled: true,
    account_details: {},
    sort_order: method.sort_order,
  }));
}

export function createDefaultEnabledOrganizationPaymentMethods() {
  return DEFAULT_PAYMENT_METHOD_TEMPLATES.map((method) => ({
    method_code: method.method_code,
    label: method.label,
  }));
}
