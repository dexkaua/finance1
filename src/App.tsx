import { ToastProvider } from "./contexts/ToastContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FinanceProvider } from "./contexts/FinanceContext";
import { useHashRoute } from "./hooks/useHashRoute";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { InvestmentsPage } from "./pages/InvestmentsPage";
import { GoalsPage } from "./pages/GoalsPage";
import { ReportsPage } from "./pages/ReportsPage";

function Router() {
  const [route, navigate] = useHashRoute();

  return (
    <AppShell route={route} onNavigate={navigate}>
      {route === "dashboard" ? <DashboardPage navigate={navigate} /> : null}
      {route === "movimentacoes" ? <TransactionsPage /> : null}
      {route === "investimentos" ? <InvestmentsPage /> : null}
      {route === "metas" ? <GoalsPage /> : null}
      {route === "relatorios" ? <ReportsPage /> : null}
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
