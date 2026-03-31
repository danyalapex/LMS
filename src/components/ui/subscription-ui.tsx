/**
 * Subscription Tier UI Components
 * Separate designs for Basic vs Premium subscriptions
 */

import React from "react";
import { GlassCard } from "@/components/ui/glassmorphism-components";

export function BasicSubscriptionCard({
  schoolName,
  planName,
  nextBillingDate,
  seatsUsed,
  totalSeats,
  isExpiring,
}: {
  schoolName: string;
  planName: string;
  nextBillingDate?: string;
  seatsUsed: number;
  totalSeats: number;
  isExpiring: boolean;
}) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{schoolName}</h3>
          <p className="text-sm text-slate-600 mt-1">{planName}</p>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
          Basic Plan
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-600">Users:</span>
          <span className="font-semibold text-slate-900">
            {seatsUsed}/{totalSeats}
          </span>
        </div>

        {nextBillingDate && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Next Billing:</span>
            <span className={`font-semibold ${isExpiring ? "text-red-600" : "text-slate-900"}`}>
              {new Date(nextBillingDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {isExpiring && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700 font-semibold">⚠️ Subscription expiring soon</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PremiumSubscriptionCard({
  schoolName,
  planName,
  nextBillingDate,
  seatsUsed,
  totalSeats,
  monthlyRevenue,
  isExpiring,
}: {
  schoolName: string;
  planName: string;
  nextBillingDate?: string;
  seatsUsed: number;
  totalSeats: number;
  monthlyRevenue: number;
  isExpiring: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-xl">
      {/* Animated premium background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{schoolName}</h3>
            <p className="text-sm text-white/90 mt-1">{planName}</p>
          </div>
          <span className="px-3 py-1 bg-yellow-300/30 text-yellow-100 text-xs font-bold rounded-full border border-yellow-200/50">
            ✨ Premium
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <p className="text-white/80 text-xs">Active Users</p>
            <p className="text-2xl font-bold text-white mt-1">
              {seatsUsed}/{totalSeats}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <p className="text-white/80 text-xs">Monthly Value</p>
            <p className="text-2xl font-bold text-white mt-1">
              ${monthlyRevenue.toLocaleString()}
            </p>
          </div>
        </div>

        {nextBillingDate && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 mb-4">
            <p className="text-white/80 text-xs">Next Billing</p>
            <p className={`font-semibold mt-1 ${isExpiring ? "text-red-200" : "text-white"}`}>
              {new Date(nextBillingDate).toLocaleDateString()}
            </p>
          </div>
        )}

        {isExpiring && (
          <div className="bg-red-900/40 border border-red-400/50 rounded-lg p-3">
            <p className="text-red-100 text-xs font-bold">🔔 Renewal approaching</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SubscriptionComparisonBadge({
  tier,
  isPremium,
}: {
  tier: "basic" | "premium";
  isPremium: boolean;
}) {
  if (!isPremium) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg">
        <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
        <span className="text-xs font-semibold text-slate-700">Standard Plan</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg">
      <span className="text-sm">✨</span>
      <span className="text-xs font-bold">Premium Plan</span>
    </div>
  );
}

export function SubscriptionStatusTimeline({
  startDate,
  endDate,
  renewalDate,
  status,
}: {
  startDate: string;
  endDate: string;
  renewalDate?: string;
  status: "active" | "expiring" | "expired";
}) {
  const daysUntilExpiry = Math.ceil(
    (new Date(endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
  );

  const statusColors = {
    active: "text-green-600 bg-green-50",
    expiring: "text-orange-600 bg-orange-50",
    expired: "text-red-600 bg-red-50",
  };

  const statusIcons = {
    active: "✓",
    expiring: "⚠️",
    expired: "✕",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">Started:</span>
        <span className="font-medium">{new Date(startDate).toLocaleDateString()}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">Expires:</span>
        <span
          className={`font-medium ${daysUntilExpiry <= 30 ? "text-red-600 font-bold" : ""}`}
        >
          {new Date(endDate).toLocaleDateString()}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              status === "active"
                ? "bg-green-500"
                : status === "expiring"
                  ? "bg-orange-500"
                  : "bg-red-500"
            }`}
            style={{
              width: `${Math.max(0, (daysUntilExpiry / 365) * 100)}%`,
            }}
          />
        </div>
        <p className="text-xs text-slate-600 mt-2">
          {daysUntilExpiry > 0
            ? `${daysUntilExpiry} days remaining`
            : "Subscription expired"}
        </p>
      </div>

      <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${statusColors[status]}`}>
        <span>{statusIcons[status]}</span>
        <span className="text-sm font-semibold">
          {status === "active" && "Active Subscription"}
          {status === "expiring" && "Expiring Soon"}
          {status === "expired" && "Subscription Expired"}
        </span>
      </div>
    </div>
  );
}
