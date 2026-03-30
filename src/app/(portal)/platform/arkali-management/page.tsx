import { headers, cookies } from "next/headers";
import crypto from "crypto";
import { PremiumCard, PremiumGrid, PremiumSectionTitle, PremiumButton } from "@/components/ui/premium-components";
import { requireRole } from "@/lib/auth";
import { getPlatformOverview, listPlatformSchools } from "@/lib/platform/queries";
import Link from "next/link";

export default async function ArkaliManagementPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const secretKey = process.env.ARKALI_ACCESS_KEY ?? "";
  const hdrs = headers();
  const cks = cookies();

  const headerKey = hdrs.get("x-arkali-key") ?? null;
  const cookieKey = cks.get("arkali_key")?.value ?? null;
  function safeEqual(a?: string | null, b?: string | null) {
    if (!a || !b) return false;
    try {
      const ab = Buffer.from(String(a));
      const bb = Buffer.from(String(b));
      const len = Math.max(ab.length, bb.length);
      const aBuf = Buffer.alloc(len);
      const bBuf = Buffer.alloc(len);
      ab.copy(aBuf);
      bb.copy(bBuf);
      return crypto.timingSafeEqual(aBuf, bBuf);
    } catch {
      return false;
    }
  }

  const hasBypass = secretKey && (safeEqual(secretKey, headerKey) || safeEqual(secretKey, cookieKey));

  if (!hasBypass) {
    await requireRole(["platform_admin"]);
  }

  const [overview, schools] = await Promise.all([getPlatformOverview(), listPlatformSchools()]);

  return (
    <div className="p-6 space-y-6">
      <PremiumSectionTitle title="Arkali Management Console" subtitle="Monitor schools, subscriptions and upcoming renewals." />

      <PremiumGrid columns={3} gap={6}>
        <PremiumCard>
          <div className="text-sm text-slate-500">Schools</div>
          <div className="mt-3 text-2xl font-bold">{overview.schoolCount}</div>
        </PremiumCard>

        <PremiumCard>
          <div className="text-sm text-slate-500">Active Subscriptions</div>
          <div className="mt-3 text-2xl font-bold">{overview.activeSubscriptionCount}</div>
        </PremiumCard>

        <PremiumCard>
          <div className="text-sm text-slate-500">MRR (PKR)</div>
          <div className="mt-3 text-2xl font-bold">{overview.totalMonthlyRecurringPkr}</div>
        </PremiumCard>
      </PremiumGrid>

      <PremiumCard>
        <h3 className="text-lg font-semibold mb-3">Schools & Current Subscription</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2">School</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Next billing</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2">{s.name} <span className="text-xs text-slate-500">({s.code})</span></td>
                  <td className="px-3 py-2">{s.current_subscription?.plan_name ?? "-"}</td>
                  <td className="px-3 py-2 capitalize">{s.current_subscription?.status ?? "-"}</td>
                  <td className="px-3 py-2">{s.current_subscription?.next_billing_date ?? s.current_subscription?.ends_on ?? "-"}</td>
                  <td className="px-3 py-2">
                    <Link href={`/platform/organization/${s.id}`}>
                      <PremiumButton size="sm" variant="secondary">Open</PremiumButton>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PremiumCard>
    </div>
  );
}
