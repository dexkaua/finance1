import type { Page } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import { checkDataQuality, computeScore, wealthSnapshot } from "../../utils/finance";
import { formatBRLCompact } from "../../utils/format";
import {
  IconChart,
  IconGrid,
  IconSwap,
  IconTarget,
  IconTrendUp,
  IconWallet,
  IconBank,
  IconCoins,
  IconCalendar,
  IconAlert,
  IconSearch,
  IconSun,
  IconMoon,
  IconPencil,
  IconDownload,
  Logo,
  type IconProps,
} from "../ui/icons";
import { useTheme } from "../../contexts/ThemeContext";

interface NavItem {
  page: Page;
  label: string;
  icon: (p: IconProps) => JSX.Element;
}

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Visão geral",
    items: [
      { page: "dashboard", label: "Dashboard", icon: IconGrid },
      { page: "assistente", label: "Assistente", icon: IconSearch },
    ],
  },
  {
    title: "Dinheiro",
    items: [
      { page: "movimentacoes", label: "Movimentações", icon: IconSwap },
      { page: "contas", label: "Contas", icon: IconWallet },
      { page: "cartoes", label: "Cartões", icon: IconBank },
      { page: "orcamentos", label: "Orçamentos", icon: IconCalendar },
      { page: "recorrencias", label: "Recorrências", icon: IconSun },
    ],
  },
  {
    title: "Crescimento",
    items: [
      { page: "investimentos", label: "Investimentos", icon: IconTrendUp },
      { page: "patrimonio", label: "Patrimônio", icon: IconCoins },
      { page: "metas", label: "Metas", icon: IconTarget },
    ],
  },
  {
    title: "Planejamento",
    items: [
      { page: "dividas", label: "Dívidas", icon: IconAlert },
      { page: "simulacoes", label: "Simulações", icon: IconChart },
      { page: "relatorios", label: "Relatórios", icon: IconChart },
    ],
  },
  {
    title: "Sistema",
    items: [
      { page: "saude", label: "Saúde financeira", icon: IconAlert },
      { page: "automacao", label: "Automação e regras", icon: IconPencil },
      { page: "configuracoes", label: "Configurações", icon: IconDownload },
    ],
  },
];

export function Sidebar({ route, onNavigate }: { route: Page; onNavigate: (p: Page) => void }) {
  const { appData, status } = useFinance();
  const { theme } = useTheme();

  const snapshot = wealthSnapshot(
    appData.accounts,
    appData.investments,
    appData.assets,
    appData.debts,
    appData.cards,
    appData.transactions,
    appData.invoiceExtras,
    appData.invoicePayments,
  );
  const issues = status === "ready" ? checkDataQuality(appData) : [];
  const score = status === "ready" ? computeScore(appData) : null;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-pine-950/60 bg-side text-sideink lg:flex">
      <div className="flex items-center gap-3 px-5 pb-4 pt-6">
        <Logo size={34} />
        <div className="leading-tight">
          <p className="font-display text-[15px] font-bold text-paper">Controle</p>
          <p className="font-display text-[15px] font-bold text-pine-300">Financeiro</p>
        </div>
      </div>

      <nav aria-label="Navegação principal" className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-3">
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sidemut/80">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = route === item.page;
                const Icon = item.icon;
                return (
                  <button
                    key={item.page}
                    type="button"
                    onClick={() => onNavigate(item.page)}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] font-semibold transition-all duration-150",
                      active
                        ? "bg-side2 text-paper"
                        : "text-sidemut hover:bg-side2/60 hover:text-sideink",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-pine-400 transition-all duration-200",
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                      ].join(" ")}
                    />
                    <Icon size={17} className={active ? "text-pine-300" : ""} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.page === "saude" && issues.length > 0 ? (
                      <span className="rounded-full bg-down/90 px-1.5 py-px text-[10px] font-bold text-paper">
                        {issues.length}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-pine-950/60 px-4 py-3.5">
        {score ? (
          <button
            type="button"
            onClick={() => onNavigate("saude")}
            className="flex w-full items-center justify-between rounded-lg border border-pine-800/70 bg-side2/70 px-3 py-2.5 text-left transition-colors hover:border-pine-700"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sidemut">
              Score financeiro
            </span>
            <span
              className={`font-display text-lg font-bold tnum ${
                score.score >= 70 ? "text-pine-300" : score.score >= 45 ? "text-gold" : "text-down"
              }`}
            >
              {score.score}
            </span>
          </button>
        ) : null}
        <div className="mt-2.5 flex items-center justify-between px-1">
          <p className="text-[11px] text-sidemut">
            Patrimônio líquido{" "}
            <span className="tnum font-bold text-sideink">{formatBRLCompact(snapshot.netWorth)}</span>
          </p>
          <span className="text-[10px] text-sidemut/60">{theme === "dark" ? <IconMoon size={12} /> : <IconSun size={12} />}</span>
        </div>
      </div>
    </aside>
  );
}
