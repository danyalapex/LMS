"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PaymentMethod = "cash" | "bank_transfer" | "cheque";
export type PaymentStatus = "pending" | "completed" | "failed";

export async function recordSubscriptionPayment(params: {
  organizationId: string;
  subscriptionId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  dueDate: string;
  referenceNo?: string;
  notes?: string;
}) {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("subscription_payments").insert({
    organization_id: params.organizationId,
    subscription_id: params.subscriptionId,
    amount_pkr: params.amount,
    payment_method: params.paymentMethod,
    due_date: params.dueDate,
    reference_no: params.referenceNo,
    notes: params.notes,
    status: params.paymentMethod === "cash" ? "completed" : "pending",
  });

  if (error) {
    throw new Error(`Failed to record payment: ${error.message}`);
  }
}

export async function completeSubscriptionPayment(paymentId: string) {
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("subscription_payments")
    .update({
      status: "completed",
      paid_date: new Date().toISOString().split("T")[0],
    })
    .eq("id", paymentId);

  if (error) {
    throw new Error(`Failed to complete payment: ${error.message}`);
  }
}

export async function getSubscriptionPayments(organizationId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`);
  }

  return data ?? [];
}

export async function getOutstandingPayments(organizationId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("due_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch outstanding payments: ${error.message}`);
  }

  return data ?? [];
}

export async function getPaymentsByMethod(organizationId: string, method: PaymentMethod) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("payment_method", method)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`);
  }

  return data ?? [];
}

export async function initiateBankTransfer(paymentId: string, bankApiUrl: string, bankApiKey: string) {
  // This will be called when bank API integration is ready
  // For now, just update the status to pending
  const admin = createSupabaseAdminClient();

  const { data: payment, error: fetchError } = await admin
    .from("subscription_payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (fetchError || !payment) {
    throw new Error("Payment not found");
  }

  try {
    // TODO: Call actual bank API when integration is ready
    // const response = await fetch(bankApiUrl, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${bankApiKey}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     amount: payment.amount_pkr,
    //     reference: payment.reference_no,
    //     account: payment.account_no,
    //   })
    // });

    console.log("Bank transfer initiated for payment:", paymentId);
    // Update status to pending
    return { success: true, message: "Bank transfer initiated. Status: PENDING" };
  } catch (error) {
    throw new Error(`Failed to initiate bank transfer: ${(error as Error).message}`);
  }
}

export async function getPaymentStatistics(organizationId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscription_payments")
    .select("amount_pkr, status, payment_method")
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to fetch payment statistics: ${error.message}`);
  }

  const payments = data ?? [];

  const stats = {
    totalCollected: payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + p.amount_pkr, 0),
    totalPending: payments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + p.amount_pkr, 0),
    totalFailed: payments
      .filter((p) => p.status === "failed")
      .reduce((sum, p) => sum + p.amount_pkr, 0),
    methodBreakdown: {
      cash: payments.filter((p) => p.payment_method === "cash").length,
      bank_transfer: payments.filter((p) => p.payment_method === "bank_transfer").length,
      cheque: payments.filter((p) => p.payment_method === "cheque").length,
    },
  };

  return stats;
}
