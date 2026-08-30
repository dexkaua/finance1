import type { ReactNode } from "react";
import { clamp, formatPercent } from "../../utils/format";
import { IconArrowDownRight, IconArrowUpRight } from "./icons";

export function Card({
  className = "",
  children,
  hover = false,
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border border-line bg-card shadow-sm shadow-black/[0.03]",
        hover ? "transition-all duration-200 hover:-translate-y-0.5 hover:border-linestrong hover:shadow-md" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export type BadgeTone = "up" | "down" | "inv" | "gold" | "neutral";

const BADGE_TONES: Record<BadgeTone, string> = {
  up: "bg-up/10 text-up border-up/25",
  down: "bg-down/10 text-down border-down/25",
  inv: "bg-inv/10 text-inv border-inv/25",
  gold: "bg-gold/10 text-gold border-gold/25",
  neutral: "bg-ink/5 text-mut border-line",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold",
        BADGE_TONES[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

/** Variação percentual entre dois valores, com seta e cor semântica. */
export function DeltaChip({
  current,
  previous,
  suffix = "vs mês anterior",
}: {
  current: number;
  previous: number;
  suffix?: string;
}) {
  if (previous === 0) {
    return <span className="text-[11px] font-medium text-mut">sem comparação anterior</span>;
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const positive = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
        positive ? "text-up" : "text-down"
      }`}
    >
      {positive ? <IconArrowUpRight size={13} /> : <IconArrowDownRight size={13} />}
      {formatPercent(Math.abs(delta))}
      <span className="font-medium text-mut">{suffix}</span>
    </span>
  );
}

export function ProgressBar({
  value,
  color = "var(--up)",
  className = "",
  thickness = "h-2",
  trackClass = "bg-ink/8",
}: {
  /** 0 a 1 */
  value: number;
  color?: string;
  className?: string;
  thickness?: string;
  trackClass?: string;
}) {
  const pct = clamp(value, 0, 1) * 100;
  return (
    <div className={`w-full overflow-hidden rounded-full ${trackClass} ${thickness} ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  aside,
}: {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-[13px] text-mut">{subtitle}</p> : null}
      </div>
      {aside}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="anim-rise mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-mut">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
