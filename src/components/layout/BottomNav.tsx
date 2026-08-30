import { useState } from "react";
import type { Page } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import {
  IconAlert,
  IconBank,
  IconCalendar,
  IconChart,
  IconCoins,
  IconDownload,
  IconGrid,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSun,
  IconSwap,
  IconTarget,
  IconTrendUp,
  IconWallet,
  IconX,
  type IconProps,
} from "../ui/icons";

const TABS: Array<{ page: Page; label: string; icon: (p: IconProps) => JSX.Element }> = [
  { page: "dashboard", label: "Início", icon: IconGrid },
  { page: "movimentacoes", label: "Extrato", icon: IconSwap },
  { page: "patrimonio", label: "Patrimônio", icon: IconCoins },
  { page: "simulacoes", label: "Simular", icon: IconChart },
];

const MORE_TABS: Array<{ page: Page; label: string; icon: (p: IconProps) => JSX.Element }> = [
  { page: "contas", label: "Contas", icon: IconWallet },
  { page: "cartoes", label: "Cartões", icon: IconBank },
  { page: "investimentos", label: "Investimentos", icon: IconTrendUp },
  { page: "dividas", label: "Dívidas", icon: IconAlert },
  { page: "metas", label: "Metas", icon: IconTarget },
  { page: "orcamentos", label: "Orçamentos", icon: IconCalendar },
  { page: "recorrencias", label: "Recorrências", icon: IconSun },
  { page: "relatorios", label: "Relatórios", icon: IconChart },
  { page: "assistente", label: "Assistente", icon: IconSearch },
  { page: "saude", label: "Saúde financeira", icon: IconAlert },
  { page: "automacao", label: "Automação", icon: IconPencil },
  { page: "configuracoes", label: "Configurações", icon: IconDownload },
];

export function BottomNav({ route, onNavigate }: { route: Page; onNavigate: (p: Page) => void }) {
  const { openTransactionModal } = useFinance();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isOnMoreTab = MORE_TABS.some((tab) => tab.page === route);

  const go = (page: Page) => {
    onNavigate(page);
    setSheetOpen(false);
  };

  return (
    <>
      <nav
        aria-label="Navegação inferior"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="grid grid-cols-5">
          {TABS.slice(0, 2).map((tab) => (
            <Tab key={tab.page} tab={tab} active={route === tab.page} onNavigate={go} />
          ))}
          <div className="relative flex items-start justify-center">
            <button
              type="button"
              onClick={() => openTransactionModal()}
              aria-label="Nova movimentação"
              className="-mt-5 flex items-center justify-center rounded-full border-4 border-bg bg-pine-600 text-paper shadow-lg shadow-pine-950/30 transition-transform duration-150 hover:bg-pine-700 active:scale-95"
              style={{ height: 52, width: 52 }}
            >
              <IconPlus size={22} />
            </button>
          </div>
          <Tab tab={TABS[2]} active={route === TABS[2].page} onNavigate={go} />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            className={[
              "flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors duration-150",
              isOnMoreTab || sheetOpen ? "text-up" : "text-mut hover:text-ink",
            ].join(" ")}
          >
            <IconPlus size={20} className={sheetOpen ? "rotate-45 transition-transform" : "transition-transform"} />
            {sheetOpen ? "Fechar" : "Mais"}
          </button>
        </div>
      </nav>

      {sheetOpen ? (
        <div className="fixed inset-0 z-[58] flex items-end lg:hidden">
          <div className="anim-fadein absolute inset-0 bg-black/50" onClick={() => setSheetOpen(false)} />
          <div className="anim-pop relative w-full rounded-t-2xl border-t border-line bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15" aria-hidden="true" />
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="font-display text-sm font-bold text-ink">Todos os módulos</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Fechar menu"
                className="rounded-lg p-1.5 text-mut hover:bg-ink/5 hover:text-ink"
              >
                <IconX size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {MORE_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = route === tab.page;
                return (
                  <button
                    key={tab.page}
                    type="button"
                    onClick={() => go(tab.page)}
                    className={[
                      "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-semibold transition-all duration-150",
                      active
                        ? "border-up/40 bg-up/10 text-up"
                        : "border-line bg-card2/50 text-mut hover:border-linestrong hover:text-ink",
                    ].join(" ")}
                  >
                    <Icon size={20} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Tab({
  tab,
  active,
  onNavigate,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  onNavigate: (p: Page) => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={() => onNavigate(tab.page)}
      aria-current={active ? "page" : undefined}
      className={[
        "flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors duration-150",
        active ? "text-up" : "text-mut hover:text-ink",
      ].join(" ")}
    >
      <Icon size={20} />
      {tab.label}
    </button>
  );
}
