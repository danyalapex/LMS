"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const variantClass: Record<NonNullable<FormSubmitButtonProps["variant"]>, string> = {
  primary: "button-primary",
  secondary: "button-secondary",
  danger: "button-danger",
  ghost: "button-ghost",
};

export function FormSubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      disabled={pending || props.disabled}
      className={`${variantClass[variant]} ${className}`.trim()}
    >
      {pending ? pendingLabel ?? "Saving..." : children}
    </button>
  );
}
