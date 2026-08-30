import type { Page } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import {
  IconChart,
  IconGrid,
  IconPlus,
  IconSwap,
  IconTarget,
  IconTrendUp,
  type IconProps,
} from "../ui/icons";

const TABS: Array<{ page: Page; label: string; icon: (p: IconProps) => JSX.Element }> = [
  { page: "dashboard", label: "Início", icon: IconGrid },
  { page: "movimentacoes", label: "Extrato", icon: IconSwap },
  { page: "investimentos", label: "Investir", icon: IconTrendUp },
  { page: "metas", label: "Metas", icon: IconTarget },
  { page: "relatorios", label: "Relatórios", icon: IconChart },
];

export function BottomNav({ route, onNavigate }: { route: Page; onNavigate: (p: Page) => void }) {
  const { openTransactionModal } = useFinance();

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="grid grid-cols-5">
        {TABS.slice(0, 2).map((tab) => (
          <Tab key={tab.page} tab={tab} active={route === tab.page} onNavigate={onNavigate} />
        ))}
        <div className="relative flex items-start justify-center">
          <button
            type="button"
            onClick={() => openTransactionModal()}
            aria-label="Nova movimentação"
            className="-mt-5 flex h-13 w-13 items-center justify-center rounded-full border-4 border-bg bg-pine-600 text-paper shadow-lg shadow-pine-950/30 transition-transform duration-150 hover:bg-pine-700 active:scale-95"
            style={{ height: 52, width: 52 }}
          >
            <IconPlus size={22} />
          </button>
        </div>
        {TABS.slice(2).map((tab) => (
          <Tab key={tab.page} tab={tab} active={route === tab.page} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
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
