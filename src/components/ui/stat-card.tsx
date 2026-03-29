export type TrendTone = "good" | "warn" | "neutral";

export type DashboardStat = {
  label: string;
  value: string;
  trend: string;
  tone: TrendTone;
};

type StatCardProps = {
  stat: DashboardStat;
};

const toneClass: Record<DashboardStat["tone"], string> = {
  good: "text-emerald-700 bg-emerald-50 border-emerald-200",
  warn: "text-amber-700 bg-amber-50 border-amber-200",
  neutral: "text-slate-700 bg-slate-50 border-slate-200",
};

export function StatCard({ stat }: StatCardProps) {
  return (
    <article className="panel p-5">
      <p className="text-sm font-medium text-slate-600">{stat.label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</p>
      <p
        className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass[stat.tone]}`}
      >
        {stat.trend}
      </p>
    </article>
  );
}
