import type { ReactNode } from "react";
import { Button } from "./Button";
import { IconAlert } from "./icons";

export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`anim-fadein flex flex-col items-center justify-center text-center ${
        compact ? "gap-2 py-8" : "gap-3 py-14"
      }`}
    >
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-linestrong text-mut">
          {icon}
        </div>
      ) : null}
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-sm text-sm text-mut">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="anim-fadein flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-down/10 text-down">
        <IconAlert size={24} />
      </div>
      <p className="font-display text-lg font-semibold text-ink">Algo deu errado</p>
      <p className="max-w-sm text-sm text-mut">
        Não foi possível carregar seus dados financeiros. Verifique o armazenamento do navegador e
        tente novamente.
      </p>
      <Button variant="secondary" onClick={onRetry} className="mt-2">
        Tentar novamente
      </Button>
    </div>
  );
}
