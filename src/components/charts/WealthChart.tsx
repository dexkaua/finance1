import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";

export interface WealthDatum {
  label: string;
  patrimonio: number;
}

function axisFormatter(value: number): string {
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

export function WealthChart({ data, height = 260 }: { data: WealthDatum[]; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2b8560" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2b8560" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 6" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            tick={{ fill: "var(--mut)", fontSize: 12 }}
            tickFormatter={(v: string) => v.replace("/", " ")}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--mut)", fontSize: 11 }}
            tickFormatter={axisFormatter}
            width={44}
            domain={["auto", "auto"]}
          />
          <Tooltip
            cursor={{ stroke: "var(--linestrong)", strokeDasharray: "4 4" }}
            content={<ChartTooltip names={{ patrimonio: "Patrimônio" }} />}
          />
          <Area
            type="monotone"
            dataKey="patrimonio"
            stroke="#2b8560"
            strokeWidth={2.5}
            fill="url(#wealthFill)"
            dot={false}
            activeDot={{ r: 4, fill: "#2b8560", stroke: "var(--card)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
