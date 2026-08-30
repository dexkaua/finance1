import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Goal,
  GoalInput,
  Investment,
  InvestmentInput,
  Transaction,
  TransactionInput,
} from "../types";
import {
  fetchAppData,
  persistGoals,
  persistInvestments,
  persistTransactions,
} from "../services/api";
import { uid } from "../utils/id";
import { useToast } from "./ToastContext";

type Status = "loading" | "ready" | "error";

interface TransactionModalState {
  open: boolean;
  editing: Transaction | null;
}

interface FinanceContextValue {
  status: Status;
  transactions: Transaction[];
  investments: Investment[];
  goals: Goal[];
  refresh: () => Promise<void>;
  addTransaction: (input: TransactionInput) => void;
  updateTransaction: (id: string, input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;
  addInvestment: (input: InvestmentInput) => void;
  updateInvestment: (id: string, input: InvestmentInput) => void;
  deleteInvestment: (id: string) => void;
  addGoal: (input: GoalInput) => void;
  updateGoal: (id: string, input: GoalInput) => void;
  deleteGoal: (id: string) => void;
  txModal: TransactionModalState;
  openTransactionModal: (editing?: Transaction) => void;
  closeTransactionModal: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { push } = useToast();
  const [status, setStatus] = useState<Status>("loading");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [txModal, setTxModal] = useState<TransactionModalState>({
    open: false,
    editing: null,
  });

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await fetchAppData();
      setTransactions(data.transactions);
      setInvestments(data.investments);
      setGoals(data.goals);
      setStatus("ready");
    } catch (error) {
      console.error("[finance] falha ao carregar dados:", error);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const commitTransactions = useCallback(
    (mutator: (prev: Transaction[]) => Transaction[]) => {
      setTransactions((prev) => {
        const next = mutator(prev);
        persistTransactions(next).catch(() =>
          push("error", "Falha ao salvar", "A movimentação não foi gravada neste dispositivo."),
        );
        return next;
      });
    },
    [push],
  );

  const commitInvestments = useCallback(
    (mutator: (prev: Investment[]) => Investment[]) => {
      setInvestments((prev) => {
        const next = mutator(prev);
        persistInvestments(next).catch(() =>
          push("error", "Falha ao salvar", "O investimento não foi gravado neste dispositivo."),
        );
        return next;
      });
    },
    [push],
  );

  const commitGoals = useCallback(
    (mutator: (prev: Goal[]) => Goal[]) => {
      setGoals((prev) => {
        const next = mutator(prev);
        persistGoals(next).catch(() =>
          push("error", "Falha ao salvar", "A meta não foi gravada neste dispositivo."),
        );
        return next;
      });
    },
    [push],
  );

  const addTransaction = useCallback(
    (input: TransactionInput) => {
      const tx: Transaction = { ...input, id: uid("tx"), createdAt: new Date().toISOString() };
      commitTransactions((prev) => [tx, ...prev]);
    },
    [commitTransactions],
  );

  const updateTransaction = useCallback(
    (id: string, input: TransactionInput) => {
      commitTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...input } : t)));
    },
    [commitTransactions],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      commitTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [commitTransactions],
  );

  const addInvestment = useCallback(
    (input: InvestmentInput) => {
      const inv: Investment = { ...input, id: uid("inv") };
      commitInvestments((prev) => [inv, ...prev]);
    },
    [commitInvestments],
  );

  const updateInvestment = useCallback(
    (id: string, input: InvestmentInput) => {
      commitInvestments((prev) => prev.map((i) => (i.id === id ? { ...i, ...input } : i)));
    },
    [commitInvestments],
  );

  const deleteInvestment = useCallback(
    (id: string) => {
      commitInvestments((prev) => prev.filter((i) => i.id !== id));
    },
    [commitInvestments],
  );

  const addGoal = useCallback(
    (input: GoalInput) => {
      const goal: Goal = { ...input, id: uid("goal") };
      commitGoals((prev) => [goal, ...prev]);
    },
    [commitGoals],
  );

  const updateGoal = useCallback(
    (id: string, input: GoalInput) => {
      commitGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...input } : g)));
    },
    [commitGoals],
  );

  const deleteGoal = useCallback(
    (id: string) => {
      commitGoals((prev) => prev.filter((g) => g.id !== id));
    },
    [commitGoals],
  );

  const openTransactionModal = useCallback((editing?: Transaction) => {
    setTxModal({ open: true, editing: editing ?? null });
  }, []);

  const closeTransactionModal = useCallback(() => {
    setTxModal({ open: false, editing: null });
  }, []);

  const value = useMemo<FinanceContextValue>(
    () => ({
      status,
      transactions,
      investments,
      goals,
      refresh,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addInvestment,
      updateInvestment,
      deleteInvestment,
      addGoal,
      updateGoal,
      deleteGoal,
      txModal,
      openTransactionModal,
      closeTransactionModal,
    }),
    [
      status,
      transactions,
      investments,
      goals,
      refresh,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addInvestment,
      updateInvestment,
      deleteInvestment,
      addGoal,
      updateGoal,
      deleteGoal,
      txModal,
      openTransactionModal,
      closeTransactionModal,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance deve ser usado dentro de FinanceProvider");
  return ctx;
}
