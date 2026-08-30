import { ToastProvider } from "./contexts/ToastContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FinanceProvider, useFinance } from "./contexts/FinanceContext";
import { useHashRoute } from "./hooks/useHashRoute";
import { AppShell } from "./components/layout/AppShell";
import { OnboardingScreen } from "./components/layout/OnboardingScreen";
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { AccountsPage } from "./pages/AccountsPage";
import { CardsPage } from "./pages/CardsPage";
import { InvestmentsPage } from "./pages/InvestmentsPage";
import { WealthPage } from "./pages/WealthPage";
import { DebtsPage } from "./pages/DebtsPage";
import { GoalsPage } from "./pages/GoalsPage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { RecurrencesPage } from "./pages/RecurrencesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SimulationsPage } from "./pages/SimulationsPage";
import { AssistantPage } from "./pages/AssistantPage";
import { HealthPage } from "./pages/HealthPage";
import { AutomationPage } from "./pages/AutomationPage";
import { SettingsPage } from "./pages/SettingsPage";

function Router() {
  const [route, navigate] = useHashRoute();
  const { status, settings } = useFinance();

  // Primeiro acesso neste navegador: sem nome salvo → pergunta uma única vez.
  if (status === "ready" && !settings.userName?.trim()) {
    return <OnboardingScreen />;
  }

  return (
    <AppShell route={route} onNavigate={navigate}>
      {route === "dashboard" ? <DashboardPage navigate={navigate} /> : null}
      {route === "movimentacoes" ? <TransactionsPage /> : null}
      {route === "contas" ? <AccountsPage /> : null}
      {route === "cartoes" ? <CardsPage /> : null}
      {route === "investimentos" ? <InvestmentsPage /> : null}
      {route === "patrimonio" ? <WealthPage /> : null}
      {route === "dividas" ? <DebtsPage /> : null}
      {route === "metas" ? <GoalsPage /> : null}
      {route === "orcamentos" ? <BudgetsPage /> : null}
      {route === "recorrencias" ? <RecurrencesPage /> : null}
      {route === "relatorios" ? <ReportsPage /> : null}
      {route === "simulacoes" ? <SimulationsPage /> : null}
      {route === "assistente" ? <AssistantPage /> : null}
      {route === "saude" ? <HealthPage /> : null}
      {route === "automacao" ? <AutomationPage /> : null}
      {route === "configuracoes" ? <SettingsPage /> : null}
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <FinanceProvider>
          <Router />
        </FinanceProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
