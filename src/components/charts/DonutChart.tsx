export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
  pct: number;
}

/** Donut de alocação em SVG puro, sem dependências. */
export function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
}) {
  const radius = 46;
  const stroke = 15;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg viewBox="0 0 120 120" className="h-44 w-44 shrink-0" role="img" aria-label={centerLabel}>
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="color-mix(in oklab, var(--ink) 7%, transparent)"
        strokeWidth={stroke}
      />
      <g transform="rotate(-90 60 60)">
        {slices.map((slice) => {
          const length = (slice.pct / 100) * circumference;
          const gap = slices.length > 1 ? 2.5 : 0;
          const dash = Math.max(0.5, length - gap);
          const element = (
            <circle
              key={slice.key}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            >
              <title>{`${slice.label}: ${slice.pct.toFixed(1)}%`}</title>
            </circle>
          );
          offset += length;
          return element;
        })}
      </g>
      <text
        x="60"
        y="55"
        textAnchor="middle"
        fill="var(--mut)"
        style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: 0.6 }}
      >
        {centerLabel.toUpperCase()}
      </text>
      <text
        x="60"
        y="71"
        textAnchor="middle"
        fill="var(--ink)"
        style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)" }}
      >
        {centerValue}
      </text>
    </svg>
  );
}
