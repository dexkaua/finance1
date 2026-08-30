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
  Account,
  AppData,
  Asset,
  Automation,
  Budget,
  CreditCard,
  Debt,
  DebtPayment,
  Goal,
  Investment,
  InvoiceExtras,
  InvoicePayment,
  Recurrence,
  Rule,
  Settings,
  Transaction,
  TransactionInput,
  AuditEntry,
} from "../types";
import { fetchAppData, persistCollection } from "../services/api";
import { DEFAULT_SETTINGS } from "../data/seed";
import { STORAGE_KEYS } from "../services/storage";
import { getCategory } from "../data/categories";
import { addDaysISO, addMonthsISO, monthKeyOf, todayISO } from "../utils/date";
import { normalizeText, planInstallments } from "../utils/finance";
import { setActiveCurrency } from "../utils/format";
import { uid } from "../utils/id";
import { useToast } from "./ToastContext";

type Status = "loading" | "ready" | "error";

interface TransactionModalState {
  open: boolean;
  editing: Transaction | null;
  prefillKind?: Transaction["kind"];
  prefillAccountId?: string;
}

interface FinanceContextValue {
  status: Status;
  refresh: () => Promise<void>;
  transactions: Transaction[];
  accounts: Account[];
  cards: CreditCard[];
  investments: Investment[];
  debts: Debt[];
  goals: Goal[];
  budgets: Budget[];
  assets: Asset[];
  recurrences: Recurrence[];
  rules: Rule[];
  automations: Automation[];
  invoiceExtras: InvoiceExtras[];
  invoicePayments: InvoicePayment[];
  settings: Settings;
  appData: AppData;

  addTransaction: (input: TransactionInput) => Transaction;
  updateTransaction: (id: string, input: Partial<TransactionInput>, reason?: string) => void;
  cancelTransaction: (id: string, reason?: string) => void;
  reverseTransaction: (id: string, reason?: string) => void;
  reactivateTransaction: (id: string) => void;
  importTransactions: (items: TransactionInput[]) => number;
  createInstallmentPurchase: (
    input: TransactionInput,
    count: number,
  ) => void;

  addAccount: (input: Omit<Account, "id">) => void;
  updateAccount: (id: string, input: Partial<Account>) => void;
  removeAccount: (id: string) => void;

  addCard: (input: Omit<CreditCard, "id">) => void;
  updateCard: (id: string, input: Partial<CreditCard>) => void;
  removeCard: (id: string) => void;
  saveInvoiceExtras: (cardId: string, month: string, extras: Omit<InvoiceExtras, "id" | "cardId" | "month">) => void;
  payInvoice: (cardId: string, month: string, amount: number, accountId: string, date: string) => void;

  addInvestment: (input: Omit<Investment, "id">) => void;
  updateInvestment: (id: string, input: Partial<Investment>) => void;
  removeInvestment: (id: string) => void;
  groupInvestments: (items: Investment[]) => void;
  ignoreGroup: (key: string) => void;

  addDebt: (input: Omit<Debt, "id" | "payments">) => void;
  updateDebt: (id: string, input: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
  addDebtPayment: (debtId: string, payment: Omit<DebtPayment, "id">) => void;

  addGoal: (input: Omit<Goal, "id">) => void;
  updateGoal: (id: string, input: Partial<Goal>) => void;
  removeGoal: (id: string) => void;

  addBudget: (input: Omit<Budget, "id">) => void;
  updateBudget: (id: string, input: Partial<Budget>) => void;
  removeBudget: (id: string) => void;

  addAsset: (input: Omit<Asset, "id">) => void;
  updateAsset: (id: string, input: Partial<Asset>) => void;
  removeAsset: (id: string) => void;

  addRecurrence: (input: Omit<Recurrence, "id">) => void;
  updateRecurrence: (id: string, input: Partial<Recurrence>) => void;
  removeRecurrence: (id: string) => void;
  generateRecurrences: (daysAhead?: number) => number;

  addRule: (input: Omit<Rule, "id">) => void;
  updateRule: (id: string, input: Partial<Rule>) => void;
  removeRule: (id: string) => void;

  addAutomation: (input: Omit<Automation, "id">) => void;
  updateAutomation: (id: string, input: Partial<Automation>) => void;
  removeAutomation: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  fixTransactionAccount: (txId: string, accountId: string) => void;

  txModal: TransactionModalState;
  openTransactionModal: (opts?: { editing?: Transaction; prefillKind?: Transaction["kind"]; prefillAccountId?: string }) => void;
  closeTransactionModal: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

function useCollection<T extends { id: string }>(
  key: string,
  initial: T[],
): [T[], (updater: (prev: T[]) => T[]) => void] {
  const [items, setItems] = useState<T[]>(initial);
  const update = useCallback(
    (updater: (prev: T[]) => T[]) => {
      setItems((prev) => {
        const next = updater(prev);
        persistCollection(key, next).catch((error) => {
          console.error("[finance] falha ao persistir:", error);
        });
        return next;
      });
    },
    [key],
  );
  return [items, update];
}

function diffChanges(before: Transaction, after: Transaction): AuditEntry["changes"] {
  const fields: Array<[keyof Transaction, string]> = [
    ["description", "Descrição"],
    ["amount", "Valor"],
    ["date", "Data"],
    ["kind", "Tipo"],
    ["categoryId", "Categoria"],
    ["accountId", "Conta"],
  ];
  const changes: NonNullable<AuditEntry["changes"]> = [];
  for (const [field, label] of fields) {
    const from = before[field];
    const to = after[field];
    if (from !== to) changes.push({ field: label, from: String(from), to: String(to) });
  }
  return changes.length > 0 ? changes : undefined;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { push } = useToast();
  const [status, setStatus] = useState<Status>("loading");

  const [transactions, setTransactions] = useCollection<Transaction>(STORAGE_KEYS.transactions, []);
  const [accounts, setAccounts] = useCollection<Account>(STORAGE_KEYS.accounts, []);
  const [cards, setCards] = useCollection<CreditCard>(STORAGE_KEYS.cards, []);
  const [investments, setInvestments] = useCollection<Investment>(STORAGE_KEYS.investments, []);
  const [debts, setDebts] = useCollection<Debt>(STORAGE_KEYS.debts, []);
  const [goals, setGoals] = useCollection<Goal>(STORAGE_KEYS.goals, []);
  const [budgets, setBudgets] = useCollection<Budget>(STORAGE_KEYS.budgets, []);
  const [assets, setAssets] = useCollection<Asset>(STORAGE_KEYS.assets, []);
  const [recurrences, setRecurrences] = useCollection<Recurrence>(STORAGE_KEYS.recurrences, []);
  const [rules, setRules] = useCollection<Rule>(STORAGE_KEYS.rules, []);
  const [automations, setAutomations] = useCollection<Automation>(STORAGE_KEYS.automations, []);
  const [invoiceExtras, setInvoiceExtras] = useCollection<InvoiceExtras>(STORAGE_KEYS.invoiceExtras, []);
  const [invoicePayments, setInvoicePayments] = useCollection<InvoicePayment>(STORAGE_KEYS.invoicePayments, []);
  const [settings, setSettingsState] = useState<Settings | null>(null);

  const [txModal, setTxModal] = useState<TransactionModalState>({ open: false, editing: null });

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await fetchAppData();
      setTransactions(() => data.transactions);
      setAccounts(() => data.accounts);
      setCards(() => data.cards);
      setInvestments(() => data.investments);
      setDebts(() => data.debts);
      setGoals(() => data.goals);
      setBudgets(() => data.budgets);
      setAssets(() => data.assets);
      setRecurrences(() => data.recurrences);
      setRules(() => data.rules);
      setAutomations(() => data.automations);
      setInvoiceExtras(() => data.invoiceExtras);
      setInvoicePayments(() => data.invoicePayments);
      setSettingsState(data.settings);
      setStatus("ready");
    } catch (error) {
      console.error("[finance] falha ao carregar dados:", error);
      setStatus("error");
    }
  }, [setTransactions, setAccounts, setCards, setInvestments, setDebts, setGoals, setBudgets, setAssets, setRecurrences, setRules, setAutomations, setInvoiceExtras, setInvoicePayments]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (settings) setActiveCurrency(settings.currency);
  }, [settings]);

  const safeSettings: Settings = useMemo(
    () => settings ?? { ...DEFAULT_SETTINGS },
    [settings],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettingsState((prev) => {
        const next = { ...(prev ?? safeSettings), ...patch };
        persistCollection(STORAGE_KEYS.settings, next).catch(() => undefined);
        return next;
      });
    },
    [safeSettings],
  );

  /* ------------------------- Transações + regras ------------------------ */

  const applyRules = useCallback(
    (tx: Transaction): Transaction => {
      const desc = normalizeText(tx.description);
      for (const rule of rules) {
        if (!rule.enabled) continue;
        const target = normalizeText(rule.match.value);
        const hit =
          rule.match.operator === "contem" ? desc.includes(target)
          : rule.match.operator === "comeca" ? desc.startsWith(target)
          : desc === target;
        if (hit && rule.action.type === "categoria") {
          const cat = getCategory(rule.action.categoryId);
          if (!cat) continue;
          if (cat.parentId) {
            return { ...tx, categoryId: cat.parentId, subcategoryId: cat.id };
          }
          return { ...tx, categoryId: cat.id };
        }
      }
      return tx;
    },
    [rules],
  );

  const addTransaction = useCallback(
    (input: TransactionInput): Transaction => {
      let tx: Transaction = {
        ...input,
        id: uid("tx"),
        status: "criada",
        source: input.source ?? "manual",
        audit: [{ at: new Date().toISOString(), action: "criada" }],
        createdAt: new Date().toISOString(),
      };
      if (tx.source === "manual") tx = applyRules(tx);
      setTransactions((prev) => [tx, ...prev]);

      // Automações: salário recebido → divisão automática (só para lançamentos manuais).
      if (tx.source === "manual" && tx.kind === "receita") {
        const triggered = automations.filter(
          (a) => a.enabled && a.triggerCategoryId === tx.categoryId,
        );
        for (const automation of triggered) {
          const splits = automation.splits.map<Transaction>((split) => ({
            id: uid("tx"),
            kind: split.kind === "aporte" ? "aporte" : "despesa",
            description: `${split.label} — ${automation.name}`,
            amount: Math.round(tx.amount * split.pct) / 100,
            categoryId: split.categoryId,
            date: tx.date,
            accountId: split.accountId ?? tx.accountId,
            paymentMethod: tx.paymentMethod,
            status: "criada",
            source: "automacao",
            note: `Criada automaticamente por “${automation.name}” (${split.pct}% de ${tx.description}).`,
            audit: [{ at: new Date().toISOString(), action: "criada", reason: "Automação" }],
            createdAt: new Date().toISOString(),
          }));
          if (splits.length > 0) {
            setTransactions((prev) => [...splits, ...prev]);
            push("info", "Automação executada", `“${automation.name}” criou ${splits.length} lançamentos.`);
          }
        }
      }
      return tx;
    },
    [applyRules, automations, setTransactions, push],
  );

  const updateTransaction = useCallback(
    (id: string, input: Partial<TransactionInput>, reason?: string) => {
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id !== id) return tx;
          const next = { ...tx, ...input };
          const changes = diffChanges(tx, next);
          const entry: AuditEntry = {
            at: new Date().toISOString(),
            action: reason ? "corrigida" : "alterada",
            reason,
            changes,
          };
          return { ...next, status: entry.action === "corrigida" ? "corrigida" : "alterada", audit: [...tx.audit, entry] };
        }),
      );
    },
    [setTransactions],
  );

  const cancelTransaction = useCallback(
    (id: string, reason?: string) => {
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === id
            ? {
                ...tx,
                status: "cancelada",
                audit: [...tx.audit, { at: new Date().toISOString(), action: "cancelada", reason }],
              }
            : tx,
        ),
      );
    },
    [setTransactions],
  );

  const reverseTransaction = useCallback(
    (id: string, reason?: string) => {
      setTransactions((prev) => {
        const original = prev.find((tx) => tx.id === id);
        if (!original) return prev;
        const mirror: Transaction = {
          id: uid("tx"),
          kind: "estorno",
          description: `Estorno: ${original.description}`,
          amount: original.amount,
          categoryId: original.categoryId,
          subcategoryId: original.subcategoryId,
          date: todayISO(),
          accountId: original.accountId,
          cardId: original.cardId,
          paymentMethod: original.paymentMethod,
          status: "criada",
          source: "manual",
          note: `Estorno de “${original.description}” (${original.date}).`,
          audit: [{ at: new Date().toISOString(), action: "criada", reason }],
          createdAt: new Date().toISOString(),
        };
        const marked: Transaction = {
          ...original,
          status: "estornada",
          audit: [...original.audit, { at: new Date().toISOString(), action: "estornada", reason }],
        };
        return [mirror, ...prev.map((tx) => (tx.id === id ? marked : tx))];
      });
    },
    [setTransactions],
  );

  const reactivateTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === id
            ? { ...tx, status: "alterada", audit: [...tx.audit, { at: new Date().toISOString(), action: "reativada" }] }
            : tx,
        ),
      );
    },
    [setTransactions],
  );

  const importTransactions = useCallback(
    (items: TransactionInput[]): number => {
      const stamped: Transaction[] = items.map((input) => ({
        ...input,
        id: uid("tx"),
        status: "criada",
        source: "importacao",
        audit: [{ at: new Date().toISOString(), action: "criada", reason: "Importação CSV" }],
        createdAt: new Date().toISOString(),
      }));
      setTransactions((prev) => [...stamped, ...prev]);
      return stamped.length;
    },
    [setTransactions],
  );

  /** Compra parcelada: gera N parcelas previstas sem duplicar o valor cheio. */
  const createInstallmentPurchase = useCallback(
    (input: TransactionInput, count: number) => {
      const card = cards.find((c) => c.id === input.cardId);
      if (!card) {
        push("error", "Cartão não encontrado", "Selecione o cartão da compra parcelada.");
        return;
      }
      const firstMonth = monthKeyOf(input.date);
      const plan = planInstallments(input.amount, count, firstMonth, card);
      const installments: Transaction[] = plan.dates.map((date, index) => ({
        id: uid("tx"),
        kind: "despesa",
        description: `${input.description} (${index + 1}/${count})`,
        amount: index === count - 1 ? Math.round((input.amount - plan.amount * (count - 1)) * 100) / 100 : plan.amount,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId,
        date,
        accountId: input.accountId,
        cardId: card.id,
        paymentMethod: "credito",
        status: "criada",
        source: "parcelamento",
        installmentGroup: plan.groupId,
        installmentNumber: index + 1,
        installmentTotal: count,
        audit: [{ at: new Date().toISOString(), action: "criada", reason: `Compra parcelada em ${count}x` }],
        createdAt: new Date().toISOString(),
      }));
      setTransactions((prev) => [...installments, ...prev]);
    },
    [cards, setTransactions, push],
  );

  /* ------------------------------ Cartões -------------------------------- */

  const saveInvoiceExtras = useCallback(
    (cardId: string, month: string, extras: Omit<InvoiceExtras, "id" | "cardId" | "month">) => {
      setInvoiceExtras((prev) => {
        const existing = prev.find((e) => e.cardId === cardId && e.month === month);
        if (existing) {
          return prev.map((e) => (e.id === existing.id ? { ...e, ...extras } : e));
        }
        return [...prev, { id: uid("extra"), cardId, month, ...extras }];
      });
    },
    [setInvoiceExtras],
  );

  /**
   * Pagar fatura: reduz o saldo da conta (transferência), reduz a fatura e
   * libera limite — sem duplicar despesa, pois as compras já foram lançadas.
   */
  const payInvoice = useCallback(
    (cardId: string, month: string, amount: number, accountId: string, date: string) => {
      setInvoicePayments((prev) => [
        ...prev,
        { id: uid("pay"), cardId, month, amount, accountId, date },
      ]);
      const payment: Transaction = {
        id: uid("tx"),
        kind: "transferencia",
        description: `Pagamento fatura cartão ${month.split("-").reverse().join("/")}`,
        amount,
        categoryId: "outras-despesas",
        date,
        accountId,
        cardId,
        paymentMethod: "pix",
        status: "criada",
        source: "fatura",
        note: "Pagamento de fatura — movimenta a conta, não é despesa nova.",
        audit: [{ at: new Date().toISOString(), action: "criada", reason: "Pagamento de fatura" }],
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [payment, ...prev]);
    },
    [setInvoicePayments, setTransactions],
  );

  /* --------------------------- Investimentos ----------------------------- */

  /** Agrupamento contábil: soma valores e preserva os registros originais. */
  const groupInvestments = useCallback(
    (items: Investment[]) => {
      if (items.length < 2) return;
      const [keeper, ...rest] = [...items].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
      const merged = {
        ...keeper,
        quantity:
          items.every((i) => i.quantity !== null)
            ? items.reduce((acc, i) => acc + (i.quantity ?? 0), 0)
            : null,
        investedAmount: items.reduce((acc, i) => acc + i.investedAmount, 0),
        currentValue: items.reduce((acc, i) => acc + i.currentValue, 0),
        fees: items.reduce((acc, i) => acc + i.fees, 0),
        taxes: items.reduce((acc, i) => acc + i.taxes, 0),
        note: `${keeper.note ? keeper.note + " " : ""}Unificado em ${todayISO()} (${items.length} registros).`,
        mergedFrom: [
          ...(keeper.mergedFrom ?? []),
          ...items.map((i) => ({
            id: i.id,
            name: i.name,
            institution: i.institution,
            investedAmount: i.investedAmount,
            currentValue: i.currentValue,
            quantity: i.quantity,
            mergedAt: todayISO(),
          })),
        ],
      };
      setInvestments((prev) => [
        merged,
        ...prev.filter((inv) => !items.some((i) => i.id === inv.id)),
      ]);
      push("success", "Investimentos unificados", `${items.length} registros de “${keeper.name}” viraram uma única posição, com histórico preservado.`);
    },
    [setInvestments, push],
  );

  const ignoreGroup = useCallback(
    (key: string) => {
      updateSettings({ ignoredGroups: [...safeSettings.ignoredGroups, key] });
    },
    [safeSettings.ignoredGroups, updateSettings],
  );

  /* ------------------------------- Dívidas ------------------------------- */

  const addDebtPayment = useCallback(
    (debtId: string, payment: Omit<DebtPayment, "id">) => {
      setDebts((prev) =>
        prev.map((debt) => {
          if (debt.id !== debtId) return debt;
          const newBalance = Math.max(0, debt.balance - payment.amount);
          return {
            ...debt,
            balance: newBalance,
            paidInstallments:
              payment.kind === "parcela" ? debt.paidInstallments + 1 : debt.paidInstallments,
            payments: [...debt.payments, { ...payment, id: uid("dpay") }],
          };
        }),
      );
    },
    [setDebts],
  );

  /* ----------------------------- Recorrências ---------------------------- */

  const generateRecurrences = useCallback(
    (daysAhead = 30): number => {
      const limit = addDaysISO(todayISO(), daysAhead);
      const freqShift: Record<Recurrence["frequency"], (d: string) => string> = {
        semanal: (d) => addDaysISO(d, 7),
        quinzenal: (d) => addDaysISO(d, 14),
        mensal: (d) => addMonthsISO(d, 1),
        trimestral: (d) => addMonthsISO(d, 3),
        semestral: (d) => addMonthsISO(d, 6),
        anual: (d) => addMonthsISO(d, 12),
      };
      // Calcula fora do updater para retornar a contagem correta ao chamador.
      const newTxs: Transaction[] = [];
      const updated = recurrences.map((rec) => {
        if (!rec.active) return rec;
        let next = rec.nextDate;
        let lastGenerated = rec.lastGenerated;
        while (next <= limit) {
          const refKey = `${rec.id}:${next}`;
          const already = transactions.some(
            (tx) => tx.recurrenceId === rec.id && tx.date === next,
          );
          if (!already) {
            newTxs.push({
              id: uid("tx"),
              kind: "despesa",
              description: rec.description,
              amount: rec.amount,
              categoryId: rec.categoryId,
              date: next,
              accountId: rec.accountId,
              cardId: rec.cardId,
              paymentMethod: rec.cardId ? "credito" : "debito",
              status: "criada",
              source: "recorrencia",
              recurrenceId: rec.id,
              note: `Gerada automaticamente (ref ${refKey}).`,
              audit: [{ at: new Date().toISOString(), action: "criada", reason: "Recorrência" }],
              createdAt: new Date().toISOString(),
            });
          }
          lastGenerated = next;
          next = freqShift[rec.frequency](next);
        }
        return next !== rec.nextDate ? { ...rec, nextDate: next, lastGenerated } : rec;
      });
      if (newTxs.length > 0) {
        setTransactions((prev) => [...newTxs, ...prev]);
      }
      setRecurrences(() => updated);
      return newTxs.length;
    },
    [recurrences, transactions, setRecurrences, setTransactions],
  );

  /* ------------------------------ Quality fix ---------------------------- */

  const fixTransactionAccount = useCallback(
    (txId: string, accountId: string) => {
      updateTransaction(txId, { accountId }, "Correção de conta pelo verificador de qualidade");
    },
    [updateTransaction],
  );

  /* ------------------------------ CRUD genérico -------------------------- */

  const makeCrud = useCallback(
    <T extends { id: string }>(setter: (u: (prev: T[]) => T[]) => void) => ({
      add: (input: Omit<T, "id">) => setter((prev) => [{ ...(input as object), id: uid("item") } as T, ...prev]),
      update: (id: string, input: Partial<T>) =>
        setter((prev) => prev.map((item) => (item.id === id ? { ...item, ...input } : item))),
      remove: (id: string) => setter((prev) => prev.filter((item) => item.id !== id)),
    }),
    [],
  );

  const accountsCrud = useMemo(() => makeCrud<Account>(setAccounts), [makeCrud, setAccounts]);
  const cardsCrud = useMemo(() => makeCrud<CreditCard>(setCards), [makeCrud, setCards]);
  const investmentsCrud = useMemo(() => makeCrud<Investment>(setInvestments), [makeCrud, setInvestments]);
  const debtsCrud = useMemo(() => makeCrud<Debt>(setDebts), [makeCrud, setDebts]);
  const goalsCrud = useMemo(() => makeCrud<Goal>(setGoals), [makeCrud, setGoals]);
  const budgetsCrud = useMemo(() => makeCrud<Budget>(setBudgets), [makeCrud, setBudgets]);
  const assetsCrud = useMemo(() => makeCrud<Asset>(setAssets), [makeCrud, setAssets]);
  const recurrencesCrud = useMemo(() => makeCrud<Recurrence>(setRecurrences), [makeCrud, setRecurrences]);
  const rulesCrud = useMemo(() => makeCrud<Rule>(setRules), [makeCrud, setRules]);
  const automationsCrud = useMemo(() => makeCrud<Automation>(setAutomations), [makeCrud, setAutomations]);

  const openTransactionModal = useCallback(
    (opts?: { editing?: Transaction; prefillKind?: Transaction["kind"]; prefillAccountId?: string }) => {
      setTxModal({
        open: true,
        editing: opts?.editing ?? null,
        prefillKind: opts?.prefillKind,
        prefillAccountId: opts?.prefillAccountId,
      });
    },
    [],
  );

  const closeTransactionModal = useCallback(() => {
    setTxModal({ open: false, editing: null });
  }, []);

  const appData: AppData = useMemo(
    () => ({
      schemaVersion: 2,
      transactions,
      accounts,
      cards,
      investments,
      debts,
      goals,
      budgets,
      assets,
      recurrences,
      rules,
      automations,
      invoiceExtras,
      invoicePayments,
      settings: safeSettings,
    }),
    [transactions, accounts, cards, investments, debts, goals, budgets, assets, recurrences, rules, automations, invoiceExtras, invoicePayments, safeSettings],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      status,
      refresh,
      transactions,
      accounts,
      cards,
      investments,
      debts,
      goals,
      budgets,
      assets,
      recurrences,
      rules,
      automations,
      invoiceExtras,
      invoicePayments,
      settings: safeSettings,
      appData,
      addTransaction,
      updateTransaction,
      cancelTransaction,
      reverseTransaction,
      reactivateTransaction,
      importTransactions,
      createInstallmentPurchase,
      addAccount: accountsCrud.add,
      updateAccount: accountsCrud.update,
      removeAccount: accountsCrud.remove,
      addCard: cardsCrud.add,
      updateCard: cardsCrud.update,
      removeCard: cardsCrud.remove,
      saveInvoiceExtras,
      payInvoice,
      addInvestment: investmentsCrud.add,
      updateInvestment: investmentsCrud.update,
      removeInvestment: investmentsCrud.remove,
      groupInvestments,
      ignoreGroup,
      addDebt: (input) => debtsCrud.add({ ...input, payments: [] }),
      updateDebt: debtsCrud.update,
      removeDebt: debtsCrud.remove,
      addDebtPayment,
      addGoal: goalsCrud.add,
      updateGoal: goalsCrud.update,
      removeGoal: goalsCrud.remove,
      addBudget: budgetsCrud.add,
      updateBudget: budgetsCrud.update,
      removeBudget: budgetsCrud.remove,
      addAsset: assetsCrud.add,
      updateAsset: assetsCrud.update,
      removeAsset: assetsCrud.remove,
      addRecurrence: recurrencesCrud.add,
      updateRecurrence: recurrencesCrud.update,
      removeRecurrence: recurrencesCrud.remove,
      generateRecurrences,
      addRule: rulesCrud.add,
      updateRule: rulesCrud.update,
      removeRule: rulesCrud.remove,
      addAutomation: automationsCrud.add,
      updateAutomation: automationsCrud.update,
      removeAutomation: automationsCrud.remove,
      updateSettings,
      fixTransactionAccount,
      txModal,
      openTransactionModal,
      closeTransactionModal,
    }),
    [
      status, refresh, transactions, accounts, cards, investments, debts, goals, budgets, assets,
      recurrences, rules, automations, invoiceExtras, invoicePayments, safeSettings, appData,
      addTransaction, updateTransaction, cancelTransaction, reverseTransaction, reactivateTransaction,
      importTransactions, createInstallmentPurchase, accountsCrud, cardsCrud, saveInvoiceExtras,
      payInvoice, investmentsCrud, groupInvestments, ignoreGroup, debtsCrud, addDebtPayment,
      goalsCrud, budgetsCrud, assetsCrud, recurrencesCrud, generateRecurrences, rulesCrud,
      automationsCrud, updateSettings, fixTransactionAccount, txModal, openTransactionModal,
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


