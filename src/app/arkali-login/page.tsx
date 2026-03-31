"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PremiumButton, PremiumInput } from "@/components/ui/premium-components";

export default function ArkaliLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      const response = await fetch("/api/arkali/login", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Redirect to Arkali management
      router.push("/platform/arkali-management");
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-8">
      <main className="w-full">
        <section className="panel p-8">
          <p className="chip">Arkali Solutions</p>
          <h1 className="mt-4 text-3xl font-bold">Arkali Admin Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in with your Arkali staff account to access the Arkali console.</p>

          {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

          <div className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              <label htmlFor="arkali-email" className="sr-only">Email</label>
              <PremiumInput
                id="arkali-email"
                name="email"
                type="email"
                placeholder="you@arkali.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />

              <label htmlFor="arkali-password" className="sr-only">Password</label>
              <PremiumInput
                id="arkali-password"
                name="password"
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />

              <PremiumButton type="submit" variant="primary" size="md" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in to Arkali"}
              </PremiumButton>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
