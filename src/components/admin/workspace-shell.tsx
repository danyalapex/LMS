import type { ReactNode } from "react";

type WorkspaceStat = {
  label: string;
  value: string;
  helper: string;
  tone?: "accent" | "neutral" | "warn";
};

type WorkspaceShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats: WorkspaceStat[];
  children: ReactNode;
};

type WorkspaceSectionProps = {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: "default" | "accent";
};

const statToneClass: Record<NonNullable<WorkspaceStat["tone"]>, string> = {
  accent: "workspace-stat-accent",
  neutral: "workspace-stat-neutral",
  warn: "workspace-stat-warn",
};

export function WorkspaceShell({
  eyebrow,
  title,
  description,
  stats,
  children,
}: WorkspaceShellProps) {
  return (
    <div className="space-y-5">
      <section className="workspace-hero">
        <div className="space-y-3">
          <p className="eyebrow">{eyebrow}</p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
              {description}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className={`workspace-stat ${statToneClass[stat.tone ?? "neutral"]}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-slate-600">{stat.helper}</p>
            </article>
          ))}
        </div>
      </section>

      {children}
    </div>
  );
}

export function WorkspaceSection({
  title,
  description,
  action,
  children,
  tone = "default",
}: WorkspaceSectionProps) {
  return (
    <section className={tone === "accent" ? "workspace-panel-accent" : "workspace-panel"}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="max-w-2xl text-sm text-slate-600">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "status-pill status-pill-good"
      : tone === "warn"
        ? "status-pill status-pill-warn"
        : "status-pill status-pill-neutral";

  return <span className={toneClass}>{children}</span>;
}
