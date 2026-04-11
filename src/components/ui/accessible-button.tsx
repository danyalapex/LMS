"use client";

import React, { forwardRef } from "react";

type AccessibleButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
};

/**
 * AccessibleButton
 * Use this whenever you can render a native <button>. It preserves keyboard
 * behavior (Enter/Space) and works on mouse/touch without extra handlers.
 */
export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  function AccessibleButton({ children, className = "", disabled, ...props }, ref) {
    return (
      <button
        {...props}
        ref={ref}
        disabled={disabled}
        className={className}
      >
        {children}
      </button>
    );
  }
);

type AccessibleDivButtonProps = React.HTMLAttributes<HTMLDivElement> & {
  onClick?: (e?: any) => void;
  disabled?: boolean;
  children?: React.ReactNode;
};

/**
 * AccessibleDivButton
 * For cases where you cannot use a native <button> (legacy markup, anchors used as buttons).
 * It adds `role="button"`, `tabIndex`, and handles Enter/Space so keyboard and touch work.
 */
export function AccessibleDivButton({
  children,
  onClick,
  className = "",
  disabled = false,
  tabIndex = 0,
  ...rest
}: AccessibleDivButtonProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const k = e.key;
    if (k === "Enter" || k === " " || k === "Spacebar") {
      e.preventDefault();
      onClick?.(e);
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : tabIndex}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled || undefined}
      className={className}
      {...rest}
    >
      {children}
    </div>
  );
}

export default AccessibleButton;
