"use client";

import { useState } from "react";
import { PremiumButton } from "@/components/ui/premium-components";

interface PremiumPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: any[];
  onSelectPlan?: (planId: string) => void;
}

export function PremiumPlanModal({
  isOpen,
  onClose,
  plans,
  onSelectPlan,
}: PremiumPlanModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <h2 className="text-3xl font-bold">Choose Your Plan</h2>
          <p className="text-blue-100 mt-2">
            Select the perfect plan for your school
          </p>
        </div>

        {/* Plans Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isPremium = plan.includes_personal_branding;

            return (
              <div
                key={plan.id}
                className={`rounded-lg border-2 p-6 transition-all cursor-pointer ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 ring-2 ring-blue-400"
                    : "border-slate-200 hover:border-blue-300"
                } ${isPremium ? "relative" : ""}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {isPremium && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                    PREMIUM
                  </div>
                )}

                {/* Plan Name */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-sm text-slate-500">{plan.code}</p>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-3xl font-bold text-slate-900">
                    PKR {plan.monthly_price_pkr}
                  </span>
                  <span className="text-slate-600 ml-2">/month</span>
                </div>

                {/* Description */}
                {plan.description && (
                  <p className="text-sm text-slate-600 mb-4">{plan.description}</p>
                )}

                {/* Features */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">
                    Features:
                  </h4>
                  <ul className="space-y-1">
                    {(plan.features || []).map((feature: string, idx: number) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start">
                        <span className="text-blue-600 mr-2">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Select Button */}
                <div className="mb-4">
                  <PremiumButton
                    size="md"
                    variant={isSelected ? "primary" : "secondary"}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(plan.id);
                    }}
                  >
                    {isSelected ? "✓ Selected" : "Select Plan"}
                  </PremiumButton>
                </div>

                {/* Status */}
                <div className="text-xs text-slate-500">
                  {plan.active ? (
                    <span className="text-green-600 font-semibold">Available</span>
                  ) : (
                    <span className="text-red-600 font-semibold">Unavailable</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t p-6 flex justify-between items-center">
          <p className="text-sm text-slate-600">
            {selectedPlan
              ? `Plan selected. Click "Confirm" to proceed.`
              : "Select a plan to get started."}
          </p>
          <div className="flex gap-3">
            <PremiumButton variant="secondary" onClick={onClose}>
              Cancel
            </PremiumButton>
            <PremiumButton
              variant="primary"
              disabled={!selectedPlan}
              onClick={() => {
                if (selectedPlan && onSelectPlan) {
                  onSelectPlan(selectedPlan);
                  onClose();
                }
              }}
            >
              Confirm Selection
            </PremiumButton>
          </div>
        </div>
      </div>
    </div>
  );
}
