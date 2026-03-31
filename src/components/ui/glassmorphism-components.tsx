/**
 * Glassmorphism UI Components
 * Modern frosted glass design with transparency and backdrop blur
 */

import React from "react";

export function GlassCard({
  children,
  className = "",
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 transition-all duration-300 ${
        hover ? "hover:bg-white/15 hover:border-white/30 hover:shadow-2xl" : ""
      } shadow-xl ${className}`}
    >
      {children}
    </div>
  );
}

export function GradientGlassCard({
  children,
  gradientFrom = "from-blue-500/20",
  gradientTo = "to-purple-500/20",
  className = "",
}: {
  children: React.ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative backdrop-blur-xl overflow-hidden rounded-2xl p-6 shadow-2xl border border-white/20 transition-all duration-300 hover:shadow-3xl hover:border-white/30 ${className}`}
      style={{
        background: `linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(168,85,247,0.1) 100%)`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function BrandedHeader({
  schoolName,
  studentName,
  isPremium = false,
  backgroundColor = "from-blue-600 to-purple-600",
}: {
  schoolName: string;
  studentName: string;
  isPremium?: boolean;
  backgroundColor?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-8 mb-8 shadow-2xl text-white ${
        isPremium ? "ring-2 ring-yellow-400" : ""
      }`}
      style={{
        background: `linear-gradient(135deg, var(--brand-primary, #2563eb) 0%, var(--brand-accent, #7c3aed) 100%)`,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Animated background shapes */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold">{schoolName}</h1>
          {isPremium && (
            <div className="px-4 py-2 bg-yellow-400/20 border border-yellow-300/50 rounded-full text-sm font-semibold">
              ✨ Premium
            </div>
          )}
        </div>
        <p className="text-lg text-white/90">Welcome back, {studentName}</p>
        <p className="text-sm text-white/70 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

export function CourseCard({
  courseName,
  instructor,
  progress,
  upcomingDeadline,
  badge,
}: {
  courseName: string;
  instructor: string;
  progress: number;
  upcomingDeadline?: string;
  badge?: "today" | "urgent" | "completed";
}) {
  const badgeStyles = {
    today: "bg-blue-500/30 text-blue-200 border border-blue-300/50",
    urgent: "bg-red-500/30 text-red-200 border border-red-300/50",
    completed: "bg-green-500/30 text-green-200 border border-green-300/50",
  };

  return (
    <GlassCard className="group cursor-pointer">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
            {courseName}
          </h3>
          <p className="text-sm text-white/60 mt-1">{instructor}</p>
        </div>
        {badge && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeStyles[badge]} whitespace-nowrap ml-2`}>
            {badge === "today" && "📅 Today"}
            {badge === "urgent" && "⚠️ Urgent"}
            {badge === "completed" && "✓ Done"}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-white/70">Progress</span>
          <span className="text-xs font-semibold text-white">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {upcomingDeadline && (
        <p className="text-xs text-white/70">
          Next deadline: <span className="text-white font-semibold">{upcomingDeadline}</span>
        </p>
      )}
    </GlassCard>
  );
}

export function AnnouncementWidget({
  announcements,
}: {
  announcements: Array<{ id: string; title: string; date: string; isPinned?: boolean }>;
}) {
  const pinnedAnnouncements = announcements.filter((a) => a.isPinned).slice(0, 3);
  const latestAnnouncements = announcements
    .filter((a) => !a.isPinned)
    .slice(0, 3);

  return (
    <GradientGlassCard className="col-span-1 md:col-span-2">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
        📢 Announcements
      </h2>

      <div className="space-y-4">
        {pinnedAnnouncements.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-white/60 font-semibold mb-3">
              Pinned
            </p>
            <div className="space-y-3">
              {pinnedAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-300/30 rounded-lg cursor-pointer hover:border-yellow-300/60 transition-all"
                >
                  <p className="text-white font-semibold text-sm">{ann.title}</p>
                  <p className="text-xs text-white/60 mt-1">📌 Pinned</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-wider text-white/60 font-semibold mb-3">
            Latest
          </p>
          <div className="space-y-3">
            {latestAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className="p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-white/10"
              >
                <p className="text-white font-semibold text-sm">{ann.title}</p>
                <p className="text-xs text-white/60 mt-1">{ann.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GradientGlassCard>
  );
}

export function StatCardGlass({
  icon,
  label,
  value,
  trend,
  trendPositive = true,
}: {
  icon: string;
  label: string;
  value: string;
  trend: string;
  trendPositive?: boolean;
}) {
  return (
    <GlassCard className="text-center">
      <p className="text-4xl mb-2">{icon}</p>
      <p className="text-white/70 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-white mb-3">{value}</p>
      <p className={`text-xs ${trendPositive ? "text-green-400" : "text-red-400"}`}>
        {trendPositive ? "↑" : "↓"} {trend}
      </p>
    </GlassCard>
  );
}
