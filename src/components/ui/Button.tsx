import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Feedback";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
  full?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "bg-pine-600 text-paper hover:bg-pine-700 shadow-sm shadow-pine-950/25 border border-pine-700/60",
  secondary:
    "bg-card text-ink border border-line hover:border-linestrong hover:bg-card2",
  ghost: "text-mut hover:text-ink hover:bg-ink/5 border border-transparent",
  danger: "bg-down text-paper hover:brightness-110 border border-down/60",
  soft: "bg-up/10 text-up border border-up/20 hover:bg-up/15",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  full = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const sizeClass = size === "sm" ? "h-9 px-3 text-[13px] gap-1.5" : "h-10 px-4 text-sm gap-2";
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        "inline-flex select-none items-center justify-center rounded-lg font-semibold transition-all duration-150",
        "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        sizeClass,
        VARIANT_CLASS[variant],
        full ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon}
      {children}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "sm" | "md";
  tone?: "default" | "danger";
}

export function IconButton({
  label,
  size = "md",
  tone = "default",
  className = "",
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  const sizeClass = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const toneClass =
    tone === "danger"
      ? "text-mut hover:text-down hover:bg-down/10"
      : "text-mut hover:text-ink hover:bg-ink/5";
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        "inline-flex items-center justify-center rounded-lg transition-all duration-150 active:scale-95",
        sizeClass,
        toneClass,
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
