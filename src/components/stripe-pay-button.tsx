"use client";

import React from "react";
import { PremiumButton } from "@/components/ui/premium-components";

export default function StripePayButton({ organizationId, planCode, children }: { organizationId: string; planCode: string; children?: React.ReactNode; }) {
  const [loading, setLoading] = React.useState(false);

  async function startCheckout() {
    try {
      setLoading(true);
      const res = await fetch("/api/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, planCode }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      alert(data?.error || "Failed to start checkout");
    } catch (err) {
      alert((err as Error).message || "Checkout error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PremiumButton onClick={startCheckout} variant="primary" size="md" className="w-full">
      {loading ? "Redirecting..." : (children ?? "Pay with Card")}
    </PremiumButton>
  );
}
