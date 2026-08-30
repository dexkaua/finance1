import { useEffect, useState } from "react";
import { formatBRL, formatPercent } from "../../utils/format";

export interface CategoryBarItem {
  label: string;
  value: number;
  pct: number;
  color: string;
}

/** Barras horizontais animadas para distribuição por categoria. */
export function CategoryBars({
  items,
  max = 6,
}: {
  items: CategoryBarItem[];
  max?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const visible = items.slice(0, max);

  if (visible.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-mut">
        Sem valores para exibir neste período.
      </p>
    );
  }

  return (
    <ul className="space-y-3.5">
      {visible.map((item, index) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="tnum shrink-0 font-semibold text-ink">
              {formatBRL(item.value)}
              <span className="ml-1.5 text-[11px] font-medium text-mut">
                {formatPercent(item.pct, 0)}
              </span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: mounted ? `${Math.max(2, item.pct)}%` : "0%",
                backgroundColor: item.color,
                transitionDelay: `${index * 70}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
