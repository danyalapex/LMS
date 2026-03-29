/**
 * Premium UI Components for Elite LMS
 * Modern, polished components with gradient effects and premium styling
 */

import React from "react";

// Premium Button Styles
export function PremiumButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const baseStyles = "font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 focus:ring-blue-500",
    secondary: "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-900 hover:from-slate-200 hover:to-slate-300 focus:ring-slate-500",
    outline:
      "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500",
    ghost: "text-blue-600 hover:bg-blue-50 focus:ring-blue-500",
    danger: "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 focus:ring-red-500",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Premium Card
export function PremiumCard({
  children,
  className = "",
  hoverable = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hoverable?: boolean }) {
  return (
    <div
      className={`
        rounded-2xl
        border border-gradient-to-br from-slate-200 to-slate-300
        bg-white
        p-6
        shadow-lg shadow-slate-200
        ${hoverable ? "transition-all duration-300 hover:shadow-xl hover:shadow-slate-300 hover:scale-[1.02]" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

// Premium Stat Card
export function PremiumStatCard({
  icon,
  label,
  value,
  trend,
  trendLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}) {
  const trendColor = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-slate-600",
  };

  const trendIcon = {
    up: "📈",
    down: "📉",
    neutral: "→",
  };

  return (
    <PremiumCard hoverable>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {trend && trendLabel && (
            <p className={`mt-2 text-sm font-semibold ${trendColor[trend]}`}>
              {trendIcon[trend]} {trendLabel}
            </p>
          )}
        </div>
        <div className="text-4xl opacity-80">{icon}</div>
      </div>
    </PremiumCard>
  );
}

// Premium Input
export function PremiumInput({
  icon,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">{icon}</span>}
        <input
          className={`
            w-full
            rounded-lg
            border-2
            px-4 py-2.5
            text-base
            transition-all
            duration-200
            focus:outline-none
            focus:ring-2
            focus:ring-offset-2
            ${icon ? "pl-10" : ""}
            ${
              error
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            }
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Premium Select
export function PremiumSelect({
  icon,
  options,
  error,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <div>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">{icon}</span>}
        <select
          className={`
            w-full
            rounded-lg
            border-2
            px-4 py-2.5
            text-base
            transition-all
            duration-200
            focus:outline-none
            focus:ring-2
            focus:ring-offset-2
            appearance-none
            cursor-pointer
            ${icon ? "pl-10" : ""}
            ${
              error
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            }
          `}
          {...props}
        >
          <option value="">Select an option</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
          ▼
        </span>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Premium Badge
export function PremiumBadge({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "danger" | "info";
}) {
  const variants = {
    primary: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-purple-100 text-purple-800",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
}

// Premium Divider
export function PremiumDivider({ text }: { text?: string }) {
  if (!text) {
    return <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />;
  }

  return (
    <div className="relative flex items-center my-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <span className="px-4 text-sm font-medium text-slate-600">{text}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-300 via-slate-300 to-transparent" />
    </div>
  );
}

// Premium Alert
export function PremiumAlert({
  type = "info",
  title,
  message,
  action,
}: {
  type?: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  const styles = {
    success: { bg: "bg-green-50", border: "border-green-200", icon: "✓", color: "text-green-900" },
    error: { bg: "bg-red-50", border: "border-red-200", icon: "✕", color: "text-red-900" },
    warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "⚠️", color: "text-amber-900" },
    info: { bg: "bg-blue-50", border: "border-blue-200", icon: "ℹ️", color: "text-blue-900" },
  };

  const style = styles[type];

  return (
    <div className={`rounded-lg border-2 ${style.bg} ${style.border} p-4`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{style.icon}</span>
        <div className="flex-1">
          {title && <p className={`font-semibold ${style.color}`}>{title}</p>}
          <p className={`text-sm ${style.color}`}>{message}</p>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className={`text-sm font-semibold ${style.color} hover:underline`}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

// Premium Loading Spinner
export function PremiumSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={`${sizes[size]} animate-spin`}>
      <svg
        className="w-full h-full text-transparent"
        style={{
          background: "conic-gradient(from 0deg, #3b82f6 0deg 90deg, transparent 270deg)",
          borderRadius: "50%",
        }}
        viewBox="0 0 24 24"
      />
    </div>
  );
}

// Premium Section Title
export function PremiumSectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        {icon && <span className="text-2xl">{icon}</span>}
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      </div>
      {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
    </div>
  );
}

// Premium Grid Layout
export function PremiumGrid({
  children,
  columns = 3,
  gap = 6,
  className = "",
}: {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
}) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-5",
  };

  const gapClasses = {
    4: "gap-4",
    6: "gap-6",
    8: "gap-8",
  };

  return (
    <div className={`grid ${colClasses[columns as keyof typeof colClasses] || colClasses[3]} ${gapClasses[gap as keyof typeof gapClasses] || gapClasses[6]} ${className}`}>
      {children}
    </div>
  );
}
