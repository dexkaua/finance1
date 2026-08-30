import type { Page } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import { currentMonthKey, monthLongLabel } from "../../utils/date";
import { savingsRate, sumByType } from "../../utils/finance";
import { formatPercent } from "../../utils/format";
import { ProgressBar } from "../ui/Display";
import {
  IconChart,
  IconGrid,
  IconSwap,
  IconTarget,
  IconTrendUp,
  Logo,
  type IconProps,
} from "../ui/icons";

const NAV_ITEMS: Array<{ page: Page; label: string; icon: (p: IconProps) => JSX.Element }> = [
  { page: "dashboard", label: "Dashboard", icon: IconGrid },
  { page: "movimentacoes", label: "Movimentações", icon: IconSwap },
  { page: "investimentos", label: "Investimentos", icon: IconTrendUp },
  { page: "metas", label: "Metas", icon: IconTarget },
  { page: "relatorios", label: "Relatórios", icon: IconChart },
];

export function Sidebar({ route, onNavigate }: { route: Page; onNavigate: (p: Page) => void }) {
  const { transactions, status } = useFinance();
  const month = currentMonthKey();
  const receitas = sumByType(transactions, "receita", month);
  const despesas = sumByType(transactions, "despesa", month);
  const rate = savingsRate(receitas, despesas);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col border-r border-pine-950/60 bg-side text-sideink lg:flex">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <Logo size={36} />
        <div className="leading-tight">
          <p className="font-display text-[15px] font-bold text-paper">Controle</p>
          <p className="font-display text-[15px] font-bold text-pine-300">Financeiro</p>
        </div>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = route === item.page;
          const Icon = item.icon;
          return (
            <button
              key={item.page}
              type="button"
              onClick={() => onNavigate(item.page)}
              aria-current={active ? "page" : undefined}
              className={[
                "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                active
                  ? "bg-side2 text-paper"
                  : "text-sidemut hover:bg-side2/60 hover:text-sideink",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-pine-400 transition-all duration-200",
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                ].join(" ")}
              />
              <Icon size={19} className={active ? "text-pine-300" : ""} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-4 pb-5">
        <div className="rounded-xl border border-pine-800/70 bg-side2/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sidemut">
            Economia do mês
          </p>
          <p className="mt-1 font-display text-lg font-bold text-paper tnum">
            {status === "ready" && rate !== null ? formatPercent(rate, 0) : "—"}
          </p>
          <ProgressBar
            value={rate !== null ? rate / 100 : 0}
            color="#4d9e7c"
            className="mt-2"
            trackClass="bg-pine-950"
            thickness="h-1.5"
          />
          <p className="mt-2 text-[11px] leading-snug text-sidemut">
            da sua receita de {monthLongLabel(month).toLowerCase()} virou saldo.
          </p>
        </div>
        <p className="mt-4 px-1 text-[11px] text-sidemut/70">
          v1.0 · dados salvos neste navegador
        </p>
      </div>
    </aside>
  );
}
