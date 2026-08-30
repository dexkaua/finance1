import type { Page } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Button, IconButton } from "../ui/Button";
import { IconMoon, IconPlus, IconSun, Logo } from "../ui/icons";

const PAGE_TITLE: Record<Page, string> = {
  dashboard: "Dashboard",
  movimentacoes: "Movimentações",
  investimentos: "Investimentos",
  metas: "Metas",
  relatorios: "Relatórios",
};

export function Header({ route }: { route: Page }) {
  const { theme, toggleTheme } = useTheme();
  const { openTransactionModal } = useFinance();

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="lg:hidden">
            <Logo size={30} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-[17px] font-bold text-ink">
              {PAGE_TITLE[route]}
            </p>
            <p className="hidden truncate text-xs capitalize text-mut sm:block">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            onClick={toggleTheme}
            className="border border-line bg-card"
          >
            <span
              key={theme}
              className="anim-pop inline-flex text-gold"
            >
              {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
            </span>
          </IconButton>
          <IconButton
            label="Nova movimentação"
            onClick={() => openTransactionModal()}
            className="border border-line bg-card sm:hidden"
          >
            <IconPlus size={18} />
          </IconButton>
          <Button
            size="sm"
            className="hidden sm:inline-flex"
            icon={<IconPlus size={16} />}
            onClick={() => openTransactionModal()}
          >
            Nova movimentação
          </Button>
        </div>
      </div>
    </header>
  );
}
