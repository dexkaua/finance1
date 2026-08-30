/**
 * Motor financeiro — fonte única de verdade.
 * Todos os saldos, faturas, limites, patrimônio e resultados são DERIVADOS
 * das transações + posições cadastradas. Nada calculado é armazenado.
 */

import type {
  Account,
  AppData,
  Asset,
  Budget,
  CreditCard,
  Debt,
  Goal,
  Investment,
  Invoice,
  InvoiceExtras,
  InvoicePayment,
  Recurrence,
  Settings,
  Transaction,
  TransactionFilters,
  TxKind,
} from "../types";
import { KIND_META, getCategory, categoryPath } from "../data/categories";
import {
  currentMonthKey,
  daysUntil,
  invoiceClosingDate,
  invoiceDueDate,
  monthKeyOf,
  monthShortLabel,
  shiftMonthKey,
  todayISO,
  yearOf,
} from "./date";
import { cagr, annualize, mwrMonthly } from "./simulations";

export const ACTIVE_STATUSES = ["criada", "alterada", "corrigida"];

export function isActive(tx: Transaction): boolean {
  return ACTIVE_STATUSES.includes(tx.status);
}

/** Sinal efetivo da transação sobre o RESULTADO (receitas − despesas). */
export function resultSign(tx: Transaction): number {
  const meta = KIND_META[tx.kind];
  if (tx.kind === "ajuste") return tx.direction === "out" ? -1 : 1;
  if (meta.income) return 1;
  if (meta.expense) return -1;
  return 0;
}

/** Sinal efetivo sobre o SALDO DA CONTA. Compras no crédito não mexem na conta. */
export function accountSign(tx: Transaction): number {
  if (tx.kind === "despesa" && tx.cardId) return 0;
  const sign = resultSign(tx);
  if (sign !== 0) return sign;
  if (tx.kind === "aporte") return -1;
  if (tx.kind === "resgate") return 1;
  return 0; // transferências tratadas à parte (saída/entrada)
}

export function sumKind(
  transactions: Transaction[],
  kinds: TxKind[],
  monthKey?: string,
): number {
  return transactions.reduce((acc, tx) => {
    if (!isActive(tx) || !kinds.includes(tx.kind)) return acc;
    if (monthKey && monthKeyOf(tx.date) !== monthKey) return acc;
    const sign = tx.kind === "ajuste" ? (tx.direction === "out" ? -1 : 1) : 1;
    return acc + tx.amount * sign;
  }, 0);
}

export const INCOME_KINDS: TxKind[] = ["receita", "dividendo", "juros", "estorno"];
export const EXPENSE_KINDS: TxKind[] = ["despesa", "taxa"];

/** Resultado do mês (ajustes entram pelo sinal). */
export function monthResult(transactions: Transaction[], monthKey: string): number {
  const income = sumKind(transactions, INCOME_KINDS, monthKey);
  const expense = sumKind(transactions, EXPENSE_KINDS, monthKey);
  const ajustes = transactions.reduce((acc, tx) => {
    if (!isActive(tx) || tx.kind !== "ajuste" || monthKeyOf(tx.date) !== monthKey) return acc;
    return acc + (tx.direction === "out" ? -tx.amount : tx.amount);
  }, 0);
  return income - expense + ajustes;
}

/* ------------------------------ Contas --------------------------------- */

/** Saldo derivado da conta = inicial + movimentações ativas. */
export function accountBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.initialBalance;
  for (const tx of transactions) {
    if (!isActive(tx)) continue;
    if (tx.accountId === account.id && accountSign(tx) !== 0) {
      balance += tx.amount * accountSign(tx);
    }
    if (tx.kind === "transferencia" && tx.toAccountId === account.id) {
      balance += tx.amount;
    }
  }
  return balance;
}

export function totalAccountsBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts.reduce((acc, a) => acc + accountBalance(a, transactions), 0);
}

/* --------------------------- Cartões / faturas -------------------------- */

export function cardPurchases(
  transactions: Transaction[],
  cardId: string,
  monthKey: string,
): Transaction[] {
  return transactions.filter(
    (tx) =>
      isActive(tx) &&
      tx.kind === "despesa" &&
      tx.cardId === cardId &&
      monthKeyOf(tx.date) === monthKey,
  );
}

export function buildInvoice(
  card: CreditCard,
  month: string,
  transactions: Transaction[],
  extrasList: InvoiceExtras[],
  paymentsList: InvoicePayment[],
): Invoice {
  const purchases = cardPurchases(transactions, card.id, month);
  const extras = extrasList.find((e) => e.cardId === card.id && e.month === month);
  const extrasTotal = extras ? extras.juros + extras.multa + extras.iof + extras.tarifas : 0;
  const purchasesTotal = purchases.reduce((acc, tx) => acc + tx.amount, 0);
  const total = purchasesTotal + extrasTotal;
  const payments = paymentsList.filter((p) => p.cardId === card.id && p.month === month);
  const paid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remaining = Math.max(0, total - paid);
  const current = currentMonthKey();
  const dueDate = invoiceDueDate(month, card.closingDay, card.dueDay);

  let status: Invoice["status"];
  if (total === 0) status = month < current ? "paga" : "aberta";
  else if (paid >= total) status = "paga";
  else if (month >= current) status = "aberta";
  else if (dueDate < todayISO()) status = "vencida";
  else status = paid > 0 ? "parcialmente_paga" : "fechada";

  return {
    cardId: card.id,
    month,
    closingDate: invoiceClosingDate(month, card.closingDay),
    dueDate,
    purchases,
    extrasTotal,
    total,
    paid,
    remaining,
    status,
    payments,
  };
}

/** Limite ocupado: parcelas futuras + faturas não quitadas até o mês atual. */
export function cardLimitUsed(
  card: CreditCard,
  transactions: Transaction[],
  extrasList: InvoiceExtras[],
  paymentsList: InvoicePayment[],
): number {
  const today = todayISO();
  const current = currentMonthKey();
  let used = 0;
  const months = new Set<string>();
  for (const tx of transactions) {
    if (!isActive(tx) || tx.cardId !== card.id || tx.kind !== "despesa") continue;
    const month = monthKeyOf(tx.date);
    if (tx.date > today) {
      used += tx.amount; // parcelas/lançamentos futuros
    } else {
      months.add(month);
    }
  }
  for (const month of months) {
    if (month > current) continue;
    const invoice = buildInvoice(card, month, transactions, extrasList, paymentsList);
    used += invoice.remaining;
  }
  return used;
}

/* ---------------------------- Investimentos ----------------------------- */

export function investmentSummary(investments: Investment[]) {
  const invested = investments.reduce((a, i) => a + i.investedAmount, 0);
  const current = investments.reduce((a, i) => a + i.currentValue, 0);
  const fees = investments.reduce((a, i) => a + i.fees + i.taxes, 0);
  return {
    invested,
    current,
    profit: current - invested,
    profitPct: invested > 0 ? ((current - invested) / invested) * 100 : 0,
    fees,
    count: investments.length,
  };
}

/** Dividendos recebidos por ativo (transações kind dividendo vinculadas). */
export function dividendsByInvestment(
  transactions: Transaction[],
  investmentId: string,
): number {
  return transactions.reduce(
    (acc, tx) =>
      isActive(tx) && tx.kind === "dividendo" && tx.investmentId === investmentId
        ? acc + tx.amount
        : acc,
    0,
  );
}

export function totalDividends(transactions: Transaction[], monthKey?: string): number {
  return sumKind(transactions, ["dividendo"], monthKey);
}

export interface ReturnMetrics {
  profitPct: number;
  cagrPct: number | null;
  mwrPct: number | null;
  realPct: number | null;
}

/** Rentabilidade da carteira considerando aportes como fluxo (não lucro). */
export function portfolioReturns(
  investments: Investment[],
  transactions: Transaction[],
  inflationPct: number,
): ReturnMetrics {
  const summary = investmentSummary(investments);
  if (summary.invested <= 0) {
    return { profitPct: 0, cagrPct: null, mwrPct: null, realPct: null };
  }
  const oldest = investments.reduce(
    (min, inv) => (inv.startDate < min ? inv.startDate : min),
    todayISO(),
  );
  const days = Math.max(1, (Date.now() - new Date(oldest).getTime()) / 86_400_000);
  const years = days / 365.25;
  const cagrPct = cagr(summary.invested, summary.current, years);

  // MWR: aportes/resgates como fluxos mensais relativos ao início da carteira
  const start = new Date(oldest).getTime();
  const flows = transactions
    .filter((tx) => isActive(tx) && (tx.kind === "aporte" || tx.kind === "resgate"))
    .map((tx) => ({
      month: Math.max(0, Math.round((new Date(tx.date).getTime() - start) / (30.44 * 86_400_000))),
      amount: tx.kind === "aporte" ? tx.amount : -tx.amount,
    }));
  const totalMonths = Math.max(1, Math.round(days / 30.44));
  const mwr = mwrMonthly(flows, summary.current, totalMonths);

  const nominal = mwr !== null ? annualize(mwr) : cagrPct;
  const realPct =
    nominal !== null ? ((1 + nominal / 100) / (1 + inflationPct / 100) - 1) * 100 : null;

  return {
    profitPct: summary.profitPct,
    cagrPct,
    mwrPct: nominal,
    realPct,
  };
}

/** Chave de agrupamento: mesmo nome + tipo + instituição/corretora. */
export function investmentGroupKey(inv: Investment): string {
  const broker = (inv.broker ?? inv.institution).trim().toLowerCase();
  return `${inv.name.trim().toLowerCase()}|${inv.type}|${broker}`;
}

export interface InvestmentGroup {
  key: string;
  items: Investment[];
}

export function findInvestmentGroups(
  investments: Investment[],
  ignored: string[],
): InvestmentGroup[] {
  const map = new Map<string, Investment[]>();
  for (const inv of investments) {
    const key = investmentGroupKey(inv);
    if (ignored.includes(key)) continue;
    const list = map.get(key);
    if (list) list.push(inv);
    else map.set(key, [inv]);
  }
  return Array.from(map.entries())
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({ key, items }));
}

/* ------------------------------ Patrimônio ------------------------------ */

export function investedTotal(investments: Investment[]): number {
  return investments.reduce((a, i) => a + i.currentValue, 0);
}

export function goodsTotal(assets: Asset[]): number {
  return assets.reduce((a, x) => a + x.value, 0);
}

export function liabilitiesTotal(
  debts: Debt[],
  cards: CreditCard[],
  transactions: Transaction[],
  extrasList: InvoiceExtras[],
  paymentsList: InvoicePayment[],
): number {
  const debtsBalance = debts.reduce((a, d) => a + Math.max(0, d.balance), 0);
  const cardsUsed = cards.reduce(
    (a, c) => a + cardLimitUsed(c, transactions, extrasList, paymentsList),
    0,
  );
  return debtsBalance + cardsUsed;
}

export interface WealthSnapshot {
  accounts: number;
  investments: number;
  financialAssets: number;
  goods: number;
  grossAssets: number;
  liabilities: number;
  netWorth: number;
}

export function wealthSnapshot(
  accounts: Account[],
  investments: Investment[],
  assets: Asset[],
  debts: Debt[],
  cards: CreditCard[],
  transactions: Transaction[],
  extrasList: InvoiceExtras[],
  paymentsList: InvoicePayment[],
): WealthSnapshot {
  const accountsTotal = totalAccountsBalance(accounts, transactions);
  const investmentsTotal = investedTotal(investments);
  const goods = goodsTotal(assets);
  const liabilities = liabilitiesTotal(debts, cards, transactions, extrasList, paymentsList);
  const financialAssets = accountsTotal + investmentsTotal;
  return {
    accounts: accountsTotal,
    investments: investmentsTotal,
    financialAssets,
    goods,
    grossAssets: financialAssets + goods,
    liabilities,
    netWorth: financialAssets + goods - liabilities,
  };
}

/** Evolução patrimonial mensal (caixa + investimentos atuais + bens). */
export function wealthSeries(
  accounts: Account[],
  investments: Investment[],
  assets: Asset[],
  transactions: Transaction[],
  months: string[],
): Array<{ label: string; patrimonio: number; caixa: number }> {
  const initial = accounts.reduce((a, x) => a + x.initialBalance, 0);
  let cumulative = initial;
  const goods = goodsTotal(assets);
  const investedNow = investedTotal(investments);
  return months.map((month) => {
    for (const tx of transactions) {
      if (!isActive(tx) || monthKeyOf(tx.date) !== month) continue;
      const sign = accountSign(tx);
      if (sign !== 0) cumulative += tx.amount * sign;
      if (tx.kind === "transferencia" && tx.toAccountId) cumulative += tx.amount;
    }
    const end = `${month}-31`;
    const investedThen = investments
      .filter((inv) => inv.startDate <= end)
      .reduce((a, inv) => a + inv.currentValue, 0);
    return {
      label: monthShortLabel(month),
      patrimonio: cumulative + investedThen + goods,
      caixa: cumulative,
    };
  });
}

/* ------------------------------ Categorias ------------------------------ */

export interface CategoryTotal {
  id: string;
  label: string;
  path: string;
  color: string;
  total: number;
  pct: number;
}

export function categoryTotals(
  transactions: Transaction[],
  kind: "receita" | "despesa",
  monthKey?: string,
  includeCardPurchases = true,
): CategoryTotal[] {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (!isActive(tx) || tx.kind !== kind) continue;
    if (!includeCardPurchases && tx.cardId) continue;
    if (monthKey && monthKeyOf(tx.date) !== monthKey) continue;
    const key = tx.subcategoryId ?? tx.categoryId;
    map.set(key, (map.get(key) ?? 0) + tx.amount);
  }
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
  return Array.from(map.entries())
    .map(([id, value]) => {
      const cat = getCategory(id);
      return {
        id,
        label: cat?.label ?? id,
        path: categoryPath(id),
        color: cat?.color ?? "#8b949e",
        total: value,
        pct: total > 0 ? (value / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/* ------------------------------- Filtros -------------------------------- */

export const EMPTY_FILTERS: TransactionFilters = {
  search: "",
  kind: "todas",
  categoryId: "todas",
  accountId: "todas",
  period: "tudo",
  from: "",
  to: "",
  includeInactive: false,
};

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  const current = currentMonthKey();
  const search = filters.search.trim().toLowerCase();

  return transactions.filter((tx) => {
    if (!filters.includeInactive && !isActive(tx)) return false;
    if (filters.kind !== "todas" && tx.kind !== filters.kind) return false;
    if (filters.accountId !== "todas" && tx.accountId !== filters.accountId) return false;
    if (
      filters.categoryId !== "todas" &&
      tx.categoryId !== filters.categoryId &&
      tx.subcategoryId !== filters.categoryId
    )
      return false;
    if (search && !tx.description.toLowerCase().includes(search)) return false;

    const key = monthKeyOf(tx.date);
    switch (filters.period) {
      case "mes":
        return key === current;
      case "mes-passado":
        return key === shiftMonthKey(current, -1);
      case "3meses": {
        const startKey = shiftMonthKey(current, -2);
        return key >= startKey && key <= current;
      }
      case "ano":
        return key.slice(0, 4) === current.slice(0, 4);
      case "personalizado": {
        if (filters.from && tx.date < filters.from) return false;
        if (filters.to && tx.date > filters.to) return false;
        return true;
      }
      default:
        return true;
    }
  });
}

export function sortTransactionsDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

/* ------------------------------ Orçamentos ------------------------------ */

export interface BudgetStatus {
  budget: Budget;
  label: string;
  path: string;
  color: string;
  limit: number;
  used: number;
  pct: number;
  available: number;
  exceeded: boolean;
  /** Previsão de fechamento com base no ritmo do mês. */
  forecast: number;
}

export function budgetStatuses(
  budgets: Budget[],
  transactions: Transaction[],
): BudgetStatus[] {
  const month = currentMonthKey();
  const today = todayISO();
  const dayOfMonth = Number(today.slice(8, 10));
  const daysInMonth = Number(today.slice(8, 10)) > 0 ? new Date(Number(yearOf(today)), Number(month.slice(5, 7)), 0).getDate() : 30;

  return budgets.map((budget) => {
    const used = transactions.reduce((acc, tx) => {
      if (!isActive(tx) || tx.kind !== "despesa") return acc;
      if (monthKeyOf(tx.date) !== month) return acc;
      if (tx.categoryId !== budget.categoryId && tx.subcategoryId !== budget.categoryId) return acc;
      return acc + tx.amount;
    }, 0);
    const pct = budget.monthlyLimit > 0 ? (used / budget.monthlyLimit) * 100 : 0;
    const forecast = dayOfMonth > 0 ? (used / dayOfMonth) * daysInMonth : used;
    const cat = getCategory(budget.categoryId);
    return {
      budget,
      label: cat?.label ?? budget.categoryId,
      path: categoryPath(budget.categoryId),
      color: cat?.color ?? "#8b949e",
      limit: budget.monthlyLimit,
      used,
      pct,
      available: budget.monthlyLimit - used,
      exceeded: used > budget.monthlyLimit,
      forecast,
    };
  });
}

/* ----------------------------- Recorrências ----------------------------- */

export interface RecurrenceSuggestion {
  description: string;
  amount: number;
  categoryId: string;
  occurrences: number;
}

/** Detecta cobranças repetidas (mesma descrição+valor em 3+ meses). */
export function detectRecurrences(
  transactions: Transaction[],
  managed: Recurrence[],
): RecurrenceSuggestion[] {
  const map = new Map<string, { description: string; amount: number; categoryId: string; months: Set<string> }>();
  for (const tx of transactions) {
    if (!isActive(tx) || tx.kind !== "despesa") continue;
    const key = `${tx.description.trim().toLowerCase()}|${tx.amount.toFixed(2)}`;
    const entry = map.get(key);
    if (entry) entry.months.add(monthKeyOf(tx.date));
    else
      map.set(key, {
        description: tx.description.trim(),
        amount: tx.amount,
        categoryId: tx.subcategoryId ?? tx.categoryId,
        months: new Set([monthKeyOf(tx.date)]),
      });
  }
  const managedKeys = new Set(
    managed.map((r) => `${r.description.trim().toLowerCase()}|${r.amount.toFixed(2)}`),
  );
  return Array.from(map.entries())
    .filter(([key, entry]) => entry.months.size >= 3 && !managedKeys.has(key))
    .map(([, entry]) => ({
      description: entry.description,
      amount: entry.amount,
      categoryId: entry.categoryId,
      occurrences: entry.months.size,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/* ---------------------------- Score financeiro --------------------------- */

export interface ScoreFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface FinancialScore {
  score: number;
  factors: ScoreFactor[];
  delta: number | null;
}

export function computeScore(data: AppData): FinancialScore {
  const { transactions, accounts, investments, debts, cards, budgets, assets, invoiceExtras, invoicePayments, recurrences } = data;
  const month = currentMonthKey();
  const recentMonths = [month, shiftMonthKey(month, -1), shiftMonthKey(month, -2)];

  const expenses3 = recentMonths.reduce((acc, m) => acc + sumKind(transactions, EXPENSE_KINDS, m), 0);
  const avgMonthlyExpense = expenses3 / 3;
  const income3 = recentMonths.reduce((acc, m) => acc + sumKind(transactions, INCOME_KINDS, m), 0);
  const avgMonthlyIncome = Math.max(1, income3 / 3);

  const liquid = accounts
    .filter((a) => ["corrente", "poupanca", "carteira", "salario"].includes(a.type))
    .reduce((acc, a) => acc + Math.max(0, accountBalance(a, transactions)), 0)
    + investedTotal(investments.filter((i) => ["tesouro-selic", "cdb", "lci", "lca"].includes(i.type)));
  const reserveMonths = avgMonthlyExpense > 0 ? liquid / avgMonthlyExpense : 0;
  const reserveScore = Math.min(100, (reserveMonths / 6) * 100);

  const snapshot = wealthSnapshot(accounts, investments, assets, debts, cards, transactions, invoiceExtras, invoicePayments);
  const debtRatio = snapshot.grossAssets > 0 ? snapshot.liabilities / snapshot.grossAssets : 0;
  const debtScore = Math.max(0, 100 - debtRatio * 150);

  const savings = ((avgMonthlyIncome - avgMonthlyExpense) / avgMonthlyIncome) * 100;
  const savingsScore = Math.min(100, Math.max(0, (savings / 30) * 100));

  const investRatio =
    snapshot.financialAssets > 0 && snapshot.netWorth > 0
      ? snapshot.investments / snapshot.netWorth
      : 0;
  const investScore = Math.min(100, Math.max(0, investRatio * 130));

  const statuses = budgetStatuses(budgets, transactions);
  const budgetScore =
    statuses.length > 0
      ? (statuses.filter((s) => !s.exceeded).length / statuses.length) * 100
      : 50;

  const sixMonthsAgo = wealthSeries(
    accounts, investments, assets, transactions,
    Array.from({ length: 7 }, (_, i) => shiftMonthKey(month, -(6 - i))),
  );
  const past = sixMonthsAgo[0]?.patrimonio ?? 0;
  const now = sixMonthsAgo[sixMonthsAgo.length - 1]?.patrimonio ?? 0;
  const growth = past > 0 ? ((now - past) / Math.abs(past)) * 100 : 0;
  const growthScore = Math.min(100, Math.max(0, 50 + growth * 5));

  const recurringTotal = recurrences.filter((r) => r.active).reduce((a, r) => a + r.amount, 0);
  const recurringRatio = (recurringTotal / avgMonthlyIncome) * 100;
  const recurringScore = Math.max(0, 100 - Math.max(0, recurringRatio - 5) * 6);

  const factors: ScoreFactor[] = [
    { key: "reserve", label: "Reserva de emergência", score: reserveScore, weight: 20, detail: `${reserveMonths.toFixed(1)} meses de despesas cobertos (ideal: 6)` },
    { key: "debt", label: "Endividamento", score: debtScore, weight: 20, detail: `Passivos representam ${(debtRatio * 100).toFixed(0)}% dos ativos` },
    { key: "savings", label: "Taxa de poupança", score: savingsScore, weight: 15, detail: `${savings.toFixed(0)}% da renda média fica com você` },
    { key: "invest", label: "Patrimônio investido", score: investScore, weight: 15, detail: `${(investRatio * 100).toFixed(0)}% do patrimônio líquido está investido` },
    { key: "budget", label: "Disciplina de orçamento", score: budgetScore, weight: 10, detail: statuses.length > 0 ? `${statuses.filter((s) => !s.exceeded).length}/${statuses.length} orçamentos dentro do limite` : "Nenhum orçamento definido" },
    { key: "growth", label: "Crescimento patrimonial", score: growthScore, weight: 10, detail: `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}% em 6 meses` },
    { key: "recurring", label: "Despesas recorrentes", score: recurringScore, weight: 10, detail: `Recorrências consomem ${recurringRatio.toFixed(0)}% da renda` },
  ];

  const score = Math.round(
    factors.reduce((acc, f) => acc + f.score * f.weight, 0) /
      factors.reduce((acc, f) => acc + f.weight, 0),
  );

  return { score, factors, delta: data.settings.lastScore !== null ? score - data.settings.lastScore : null };
}

/* ------------------------ Controle de qualidade -------------------------- */

export interface DataIssue {
  id: string;
  severity: "erro" | "aviso" | "info";
  title: string;
  detail: string;
  fixLabel?: string;
  /** Identificadores usados pela ação de correção. */
  refs?: { txId?: string; accountId?: string };
}

export function checkDataQuality(data: AppData): DataIssue[] {
  const issues: DataIssue[] = [];
  const { transactions, accounts, cards, investments, invoiceExtras, invoicePayments } = data;
  const accountIds = new Set(accounts.map((a) => a.id));
  const defaultAccount = accounts[0];

  const seen = new Map<string, Transaction>();
  for (const tx of transactions) {
    if (!isActive(tx)) continue;
    if (tx.accountId && !accountIds.has(tx.accountId)) {
      issues.push({
        id: `acc-${tx.id}`,
        severity: "erro",
        title: "Movimentação sem conta válida",
        detail: `“${tx.description}” aponta para uma conta que não existe.`,
        fixLabel: defaultAccount ? "Vincular à conta principal" : undefined,
        refs: { txId: tx.id, accountId: defaultAccount?.id },
      });
    }
    if (tx.kind === "transferencia" && !tx.toAccountId) {
      issues.push({
        id: `trf-${tx.id}`,
        severity: "erro",
        title: "Transferência sem destino",
        detail: `“${tx.description}” não informa a conta de destino.`,
        fixLabel: "Cancelar lançamento",
        refs: { txId: tx.id },
      });
    }
    const dupKey = `${tx.date}|${tx.kind}|${tx.amount.toFixed(2)}|${tx.description.trim().toLowerCase()}`;
    const dup = seen.get(dupKey);
    if (dup && !tx.installmentGroup) {
      issues.push({
        id: `dup-${tx.id}`,
        severity: "aviso",
        title: "Possível duplicidade",
        detail: `“${tx.description}” aparece duas vezes em ${tx.date}.`,
        fixLabel: "Cancelar duplicada",
        refs: { txId: tx.id },
      });
    } else {
      seen.set(dupKey, tx);
    }
    if (tx.installmentGroup && tx.installmentTotal && tx.installmentNumber && tx.installmentNumber === 1) {
      const count = transactions.filter((t) => t.installmentGroup === tx.installmentGroup).length;
      if (count !== tx.installmentTotal) {
        issues.push({
          id: `inst-${tx.id}`,
          severity: "aviso",
          title: "Parcelas inconsistentes",
          detail: `“${tx.description}” tem ${count} parcelas registradas de ${tx.installmentTotal}.`,
        });
      }
    }
  }

  for (const card of cards) {
    const used = cardLimitUsed(card, transactions, invoiceExtras, invoicePayments);
    if (used > card.limit) {
      issues.push({
        id: `card-${card.id}`,
        severity: "aviso",
        title: "Limite de cartão estourado",
        detail: `${card.name}: comprometido ${(used / card.limit) * 100 > 100 ? ((used / card.limit) * 100).toFixed(0) : ""}% do limite.`,
      });
    }
  }

  for (const inv of investments) {
    if (!inv.institution.trim()) {
      issues.push({
        id: `inv-${inv.id}`,
        severity: "aviso",
        title: "Investimento sem instituição",
        detail: `“${inv.name}” não tem instituição/corretora informada.`,
      });
    }
    if (inv.currentValue <= 0 && inv.investedAmount > 0) {
      issues.push({
        id: `invzero-${inv.id}`,
        severity: "info",
        title: "Investimento sem valor atual",
        detail: `“${inv.name}” está com valor atual zerado.`,
      });
    }
  }

  return issues;
}

/* ------------------------------ Parcelamentos ---------------------------- */

export interface InstallmentPlan {
  groupId: string;
  total: number;
  count: number;
  amount: number;
  /** Datas previstas de cada parcela (vencimento da fatura de cada mês). */
  dates: string[];
}

export function planInstallments(
  total: number,
  count: number,
  firstMonth: string,
  card: CreditCard,
): InstallmentPlan {
  const amount = Math.round((total / count) * 100) / 100;
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const month = shiftMonthKey(firstMonth, i);
    dates.push(invoiceDueDate(month, card.closingDay, card.dueDay));
  }
  return { groupId: `parc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, total, count, amount, dates };
}

/* --------------------------- Busca universal ----------------------------- */

export interface SearchResults {
  transactions: Transaction[];
  accounts: Account[];
  cards: CreditCard[];
  investments: Investment[];
  debts: Debt[];
  goals: Goal[];
  assets: Asset[];
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function searchAll(query: string, data: AppData): SearchResults {
  const q = normalizeText(query.trim());
  const match = (...fields: Array<string | undefined>) =>
    q === "" ? false : fields.some((f) => f && normalizeText(f).includes(q));

  const amountQuery = query.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
  const amount = amountQuery ? Number(amountQuery) : NaN;
  const amountMatch = (value: number) => Number.isFinite(amount) && Math.abs(value - amount) < 0.005;

  return {
    transactions: data.transactions
      .filter((tx) => match(tx.description, getCategory(tx.categoryId)?.label) || amountMatch(tx.amount))
      .slice(0, 8),
    accounts: data.accounts.filter((a) => match(a.institution, a.holder, a.number)).slice(0, 5),
    cards: data.cards.filter((c) => match(c.name, c.bank)).slice(0, 5),
    investments: data.investments.filter((i) => match(i.name, i.institution, i.broker)).slice(0, 8),
    debts: data.debts.filter((d) => match(d.creditor, d.purpose)).slice(0, 5),
    goals: data.goals.filter((g) => match(g.name, g.purpose)).slice(0, 5),
    assets: data.assets.filter((a) => match(a.name)).slice(0, 5),
  };
}

/* ------------------------- Assistente (consultas) ------------------------ */

export interface AssistantAnswer {
  text: string;
  details?: string[];
}

export function answerQuestion(rawQuestion: string, data: AppData): AssistantAnswer {
  const q = normalizeText(rawQuestion);
  const { transactions, accounts, investments, debts, cards, assets, invoiceExtras, invoicePayments, budgets } = data;
  const month = currentMonthKey();
  const year = month.slice(0, 4);
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const yearMatch = q.match(/\b(20\d{2})\b/);
  const targetYear = yearMatch ? yearMatch[1] : null;
  const inPeriod = (tx: Transaction) => {
    if (q.includes("este mes") || q.includes("no mes")) return monthKeyOf(tx.date) === month;
    if (q.includes("este ano") || q.includes("no ano")) return yearOf(tx.date) === year;
    if (targetYear) return yearOf(tx.date) === targetYear;
    return true;
  };

  // Projeções: "se eu investir X por mes durante Y anos"
  const projMatch = q.match(/investir\s+(?:r\$?\s*)?([\d.,]+)\s+por\s+mes.*?(\d+)\s+anos/);
  if (projMatch) {
    const monthly = Number(projMatch[1].replace(/\./g, "").replace(",", "."));
    const years = Number(projMatch[2]);
    if (Number.isFinite(monthly) && Number.isFinite(years)) {
      const rate = data.settings.benchmarks.cdi + 1;
      const i = Math.pow(1 + rate / 100, 1 / 12) - 1;
      const n = years * 12;
      const fv = monthly * ((Math.pow(1 + i, n) - 1) / i);
      return {
        text: `Investindo ${fmt(monthly)}/mês por ${years} anos a ${rate.toFixed(1)}% a.a. (CDI+1 configurado), você acumularia cerca de ${fmt(fv)} — usando a taxa configurada em Configurações.`,
      };
    }
  }

  const goalMatch = q.match(/(?:chegar|alcancar|atingir)\s+a\s+(?:r\$?\s*)?([\d.,]+)/);
  if (goalMatch) {
    const target = Number(goalMatch[1].replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(target)) {
      const currentInvested = investedTotal(investments);
      const rate = data.settings.benchmarks.cdi + 1;
      const i = Math.pow(1 + rate / 100, 1 / 12) - 1;
      const n = 10 * 12;
      const fvCurrent = currentInvested * Math.pow(1 + i, n);
      const pmt = target <= fvCurrent ? 0 : (target - fvCurrent) / ((Math.pow(1 + i, n) - 1) / i);
      return {
        text: `Para chegar a ${fmt(target)} em 10 anos com rentabilidade de ${rate.toFixed(1)}% a.a., partindo de ${fmt(currentInvested)} investidos hoje, o aporte necessário seria de aproximadamente ${fmt(Math.max(0, pmt))}/mês.`,
      };
    }
  }

  if (matchAny(q, ["quanto posso gastar", "posso gastar"])) {
    const statuses = budgetStatuses(budgets, transactions);
    if (statuses.length === 0) {
      return { text: "Você ainda não definiu orçamentos. Crie limites por categoria na página Orçamentos para eu calcular quanto pode gastar." };
    }
    const available = statuses.reduce((acc, s) => acc + Math.max(0, s.available), 0);
    const exceeded = statuses.filter((s) => s.exceeded);
    return {
      text: `Pelos seus orçamentos, restam ${fmt(available)} disponíveis neste mês.`,
      details: exceeded.length > 0
        ? [`Atenção: ${exceeded.map((s) => s.label).join(", ")} já passou do limite.`]
        : statuses.slice(0, 4).map((s) => `${s.label}: ${fmt(Math.max(0, s.available))} restantes`),
    };
  }

  if (matchAny(q, ["quanto gastei", "gastei com", "gastos com"])) {
    const catName = extractCategory(q);
    const filtered = transactions.filter(
      (tx) => isActive(tx) && tx.kind === "despesa" && inPeriod(tx) &&
        (catName === null ||
          normalizeText(categoryPath(tx.categoryId)).includes(catName) ||
          (tx.subcategoryId ? normalizeText(categoryPath(tx.subcategoryId)).includes(catName) : false)),
    );
    if (filtered.length === 0) {
      return { text: catName ? `Não encontrei despesas com “${rawCategory(rawQuestion)}” no período informado.` : "Não encontrei despesas no período informado." };
    }
    const total = filtered.reduce((a, t) => a + t.amount, 0);
    const top = categoryTotals(filtered, "despesa").slice(0, 4);
    return {
      text: catName
        ? `Você gastou ${fmt(total)} com ${rawCategory(rawQuestion)} no período — ${filtered.length} lançamentos.`
        : `Suas despesas no período somam ${fmt(total)} em ${filtered.length} lançamentos.`,
      details: top.map((c) => `${c.path}: ${fmt(c.total)}`),
    };
  }

  if (matchAny(q, ["quanto investi", "aportei", "investi em", "aportes"])) {
    const filtered = transactions.filter((tx) => isActive(tx) && tx.kind === "aporte" && inPeriod(tx));
    const total = filtered.reduce((a, t) => a + t.amount, 0);
    return {
      text: filtered.length > 0
        ? `Você aportou ${fmt(total)} em investimentos no período (${filtered.length} aportes).`
        : "Não encontrei aportes registrados no período informado.",
    };
  }

  if (matchAny(q, ["dividendos", "rendimentos recebidos"])) {
    const filtered = transactions.filter((tx) => isActive(tx) && tx.kind === "dividendo" && inPeriod(tx));
    const total = filtered.reduce((a, t) => a + t.amount, 0);
    return {
      text: filtered.length > 0
        ? `Você recebeu ${fmt(total)} em dividendos no período (${filtered.length} pagamentos).`
        : "Nenhum dividendo registrado no período.",
    };
  }

  if (matchAny(q, ["quanto tenho hoje", "saldo", "quanto tenho em conta", "dinheiro tenho"])) {
    const total = totalAccountsBalance(accounts, transactions);
    return {
      text: `Seu saldo em contas é ${fmt(total)}.`,
      details: accounts.map((a) => `${a.institution}: ${fmt(accountBalance(a, transactions))}`),
    };
  }

  if (matchAny(q, ["patrimonio cresceu", "cresceu", "melhor ou pior"])) {
    const months6 = Array.from({ length: 7 }, (_, i) => shiftMonthKey(month, -(6 - i)));
    const series = wealthSeries(accounts, investments, assets, transactions, months6);
    const past = series[0]?.patrimonio ?? 0;
    const now = series[series.length - 1]?.patrimonio ?? 0;
    const prevMonth = shiftMonthKey(month, -1);
    const prevSeries = wealthSeries(accounts, investments, assets, transactions, [prevMonth, month]);
    const lastMonth = (prevSeries[1]?.patrimonio ?? 0) - (prevSeries[0]?.patrimonio ?? 0);
    const growthPct = past !== 0 ? ((now - past) / Math.abs(past)) * 100 : 0;
    return {
      text: `Seu patrimônio está em ${fmt(now)}: ${lastMonth >= 0 ? "+" : ""}${fmt(lastMonth)} vs mês passado e ${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}% em 6 meses.`,
    };
  }

  if (matchAny(q, ["quanto devo", "dividas", "saldo devedor"])) {
    const snapshot = wealthSnapshot(accounts, investments, assets, debts, cards, transactions, invoiceExtras, invoicePayments);
    return {
      text: debts.length > 0 || snapshot.liabilities > 0
        ? `Seus passivos somam ${fmt(snapshot.liabilities)} (dívidas + faturas em aberto).`
        : "Você não tem dívidas registradas.",
      details: debts.map((d) => `${d.creditor}: ${fmt(d.balance)}`),
    };
  }

  if (matchAny(q, ["maiores despesas", "onde estou gastando", "gastando demais"])) {
    const top = categoryTotals(transactions, "despesa", month).slice(0, 5);
    if (top.length === 0) return { text: "Sem despesas registradas neste mês ainda." };
    const statuses = budgetStatuses(budgets, transactions).filter((s) => s.exceeded);
    return {
      text: `Suas maiores categorias de despesa neste mês:`,
      details: [
        ...top.map((c) => `${c.path}: ${fmt(c.total)} (${c.pct.toFixed(0)}%)`),
        ...(statuses.length > 0 ? [`Orçamentos estourados: ${statuses.map((s) => s.label).join(", ")}`] : []),
      ],
    };
  }

  if (matchAny(q, ["quanto recebi", "receitas", "recebi este"])) {
    const total = sumKind(transactions, INCOME_KINDS, targetYear ? undefined : month);
    const filtered = transactions.filter((tx) => isActive(tx) && resultSign(tx) > 0 && (targetYear ? yearOf(tx.date) === targetYear : monthKeyOf(tx.date) === month));
    const sum = filtered.reduce((a, t) => a + t.amount, 0);
    return {
      text: `Suas receitas ${targetYear ? `em ${targetYear}` : "neste mês"} somam ${fmt(sum || total)}.`,
    };
  }

  if (matchAny(q, ["investimentos", "carteira", "quanto investi no total"])) {
    const summary = investmentSummary(investments);
    return {
      text: `Sua carteira tem ${summary.count} posições: ${fmt(summary.current)} hoje, lucro de ${fmt(summary.profit)} (${summary.profitPct.toFixed(1)}%).`,
    };
  }

  if (matchAny(q, ["metas", "caminho das metas"])) {
    const goals = data.goals;
    if (goals.length === 0) return { text: "Você ainda não tem metas criadas." };
    const onTrack = goals.filter((g) => {
      const pct = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
      const days = daysUntil(g.deadline);
      return pct >= 1 || pct >= 0.5 || days > 365;
    });
    return {
      text: `${onTrack.length} de ${goals.length} metas parecem no caminho.`,
      details: goals.slice(0, 4).map((g) => `${g.name}: ${((g.currentAmount / g.targetAmount) * 100).toFixed(0)}% de ${fmt(g.targetAmount)}`),
    };
  }

  return {
    text: "Posso responder perguntas como: “Quanto gastei com alimentação este ano?”, “Quanto investi em 2026?”, “Quanto tenho hoje?”, “Quanto meu patrimônio cresceu?”, “Quanto posso gastar este mês?”, “Quais foram minhas maiores despesas?” ou “Se eu investir R$ 600 por mês durante 20 anos, quanto terei?”. As respostas usam sempre os seus dados reais.",
  };
}

function matchAny(q: string, patterns: string[]): boolean {
  return patterns.some((p) => q.includes(p));
}

function extractCategory(q: string): string | null {
  const m = q.match(/(?:com|em)\s+([a-zà-ú\s]+?)(?:\s+(?:este|no|em|este ano|este mes|20\d{2}))?(?:\s*\?|$)/);
  return m ? normalizeText(m[1].trim()) : null;
}

function rawCategory(rawQuestion: string): string {
  const q = rawQuestion.toLowerCase();
  const m = q.match(/(?:com|em)\s+([a-zà-ú\s]+?)(?:\s+(?:este|no|em|20\d{2}))?(?:\s*\?|$)/);
  return m ? m[1].trim() : "";
}
