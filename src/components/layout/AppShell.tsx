import type { ReactNode } from "react";
import type { Page } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { TransactionModal } from "../transactions/TransactionModal";
import { ErrorState } from "../ui/Feedback";

export function AppShell({
  route,
  onNavigate,
  children,
}: {
  route: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}) {
  const { status, refresh } = useFinance();

  return (
    <div className="min-h-dvh">
      <Sidebar route={route} onNavigate={onNavigate} />
      <div className="flex min-h-dvh flex-col lg:pl-[240px]">
        <Header route={route} />
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
          {status === "error" ? <ErrorState onRetry={() => void refresh()} /> : children}
        </main>
      </div>
      <BottomNav route={route} onNavigate={onNavigate} />
      <TransactionModal />
    </div>
  );
}
