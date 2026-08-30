import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";

export interface CashflowDatum {
  label: string;
  receita: number;
  despesa: number;
  resultado: number;
}

function axisFormatter(value: number): string {
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

export function CashflowChart({
  data,
  variant = "dual",
  height = 260,
}: {
  data: CashflowDatum[];
  variant?: "dual" | "result";
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={3}>
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
          />
          <Tooltip
            cursor={{ fill: "color-mix(in oklab, var(--ink) 5%, transparent)" }}
            content={
              <ChartTooltip
                names={
                  variant === "dual"
                    ? { receita: "Receitas", despesa: "Despesas" }
                    : { resultado: "Resultado" }
                }
              />
            }
          />
          {variant === "dual" ? (
            <>
              <Bar dataKey="receita" fill="var(--up)" radius={[5, 5, 0, 0]} maxBarSize={26} />
              <Bar dataKey="despesa" fill="var(--down)" radius={[5, 5, 0, 0]} maxBarSize={26} />
            </>
          ) : (
            <Bar dataKey="resultado" radius={[5, 5, 0, 0]} maxBarSize={30}>
              {data.map((entry) => (
                <Cell
                  key={entry.label}
                  fill={entry.resultado >= 0 ? "var(--up)" : "var(--down)"}
                />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashflowLegend({ variant = "dual" }: { variant?: "dual" | "result" }) {
  return (
    <div className="flex items-center gap-4 text-xs font-medium text-mut">
      {variant === "dual" ? (
        <>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-up" /> Receitas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-down" /> Despesas
          </span>
        </>
      ) : (
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-up" />
          <span className="h-2.5 w-2.5 rounded-sm bg-down" /> Resultado do mês
        </span>
      )}
    </div>
  );
}
