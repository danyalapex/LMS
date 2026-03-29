"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { seedTestUsersAction, type SeedResult } from "@/app/actions/dev-seed";
import { PremiumButton } from "@/components/ui/premium-components";

export default function DevSeedPage() {
  const [results, setResults] = useState<SeedResult[]>([]);
  const [error, setError] = useState<string>("");
  const [isPending, startSeed] = useTransition();

  function handleSeed() {
    setError("");
    setResults([]);

    startSeed(async () => {
      try {
        const res = await seedTestUsersAction();
        setResults(res);
      } catch (err) {
        setError(String(err));
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white/95 p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-slate-900">Development Environment Setup</h1>
          <p className="mt-2 text-slate-600">
            This page is only available in development. It creates test users for all roles.
          </p>

          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Test Accounts to Create:</h2>
            <div className="space-y-3">
              {[
                { email: "aliapex59750@gmail.com", password: "SuCe)7192", role: "🔑 Platform Owner" },
                { email: "admin@arkali.com", password: "Admin@123", role: "School Admin" },
                { email: "finance@arkali.com", password: "Finance@123", role: "Finance Officer" },
                { email: "teacher@arkali.com", password: "Teacher@123", role: "Teacher" },
              ].map((account) => (
                <div key={account.email} className="rounded-lg bg-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-900">{account.role}</p>
                  <p className="mt-1 font-mono text-xs text-slate-600">{account.email}</p>
                  <p className="mt-1 font-mono text-xs text-slate-600">{account.password}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSeed}
            disabled={isPending}
            className="mt-8 w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-lg font-semibold text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            {isPending ? "🔄 Creating Users..." : "🌱 Create Test Users"}
          </button>

          {error && (
            <div className="mt-4 rounded-lg bg-red-100 p-4 text-red-700">
              <p className="text-sm font-semibold">Error:</p>
              <p className="text-xs">{error}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-6 space-y-3 border-t border-slate-200 pt-6">
              <h3 className="text-lg font-bold text-slate-900">✅ Results:</h3>
              {results.map((result) => (
                <div
                  key={result.email}
                  className={`rounded-lg p-4 ${
                    result.status === "success" ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"
                  }`}
                >
                  <p className="text-sm font-semibold">{result.email}</p>
                  {result.status === "success" ? (
                    <>
                      <p className="text-xs">✅ Created - Role: {result.role}</p>
                      <p className="mt-1 font-mono text-xs">Password: {result.password}</p>
                    </>
                  ) : (
                    <p className="text-xs">❌ {result.message}</p>
                  )}
                </div>
              ))}

              <div className="mt-6 space-y-2">
                <p className="text-sm font-semibold text-slate-900">Now you can log in!</p>
                <Link href="/login">
                  <PremiumButton variant="secondary" className="w-full">
                    Go to Login →
                  </PremiumButton>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
