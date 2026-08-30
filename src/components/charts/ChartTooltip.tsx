import { formatBRL } from "../../utils/format";

export interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

export interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<TooltipEntry>;
  names?: Record<string, string>;
}

/** Tooltip customizado compartilhado pelos gráficos recharts. */
export function ChartTooltip({ active, label, payload, names = {} }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2 shadow-xl shadow-black/10">
      {label !== undefined ? (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mut">
          {String(label).replace(".", "")}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const key = String(entry.dataKey ?? entry.name ?? index);
          const value = typeof entry.value === "number" ? entry.value : Number(entry.value ?? 0);
          return (
            <div key={key} className="flex items-center justify-between gap-4 text-[13px]">
              <span className="flex items-center gap-1.5 text-mut">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color ?? "var(--mut)" }}
                />
                {names[key] ?? entry.name ?? key}
              </span>
              <span className="tnum font-semibold text-ink">{formatBRL(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
