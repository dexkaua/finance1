import type {
  Investment,
  MonthPoint,
  Transaction,
  TransactionFilters,
  TransactionType,
} from "../types";
import { CATEGORIES, getCategory } from "../data/categories";
import {
  currentMonthKey,
  monthKeyOf,
  monthShortLabel,
  shiftMonthKey,
  todayISO,
} from "./date";

export function sumByType(
  transactions: Transaction[],
  type: TransactionType,
  monthKey?: string,
): number {
  return transactions.reduce((acc, tx) => {
    if (tx.type !== type) return acc;
    if (monthKey && monthKeyOf(tx.date) !== monthKey) return acc;
    return acc + tx.amount;
  }, 0);
}

/** Saldo líquido acumulado: receitas − despesas − aportes. */
export function liquidBalance(transactions: Transaction[]): number {
  return transactions.reduce((acc, tx) => {
    if (tx.type === "receita") return acc + tx.amount;
    return acc - tx.amount;
  }, 0);
}

export function monthResult(transactions: Transaction[], monthKey: string): number {
  return (
    sumByType(transactions, "receita", monthKey) -
    sumByType(transactions, "despesa", monthKey)
  );
}

/**
 * Série mensal completa (receitas, despesas, aportes, resultado e patrimônio).
 * O patrimônio considera todo o histórico acumulado até o fim de cada mês,
 * somando o caixa líquido ao valor de mercado dos investimentos já iniciados.
 */
export function buildMonthPoints(
  transactions: Transaction[],
  investments: Investment[],
  months: string[],
): MonthPoint[] {
  return months.map((month) => {
    const receita = sumByType(transactions, "receita", month);
    const despesa = sumByType(transactions, "despesa", month);
    const aporte = sumByType(transactions, "investimento", month);
    const monthEnd = `${month}-31`;
    const cash = transactions.reduce((acc, tx) => {
      if (tx.date > monthEnd) return acc;
      return tx.type === "receita" ? acc + tx.amount : acc - tx.amount;
    }, 0);
    const investedNow = investments
      .filter((inv) => inv.startDate <= monthEnd)
      .reduce((acc, inv) => acc + inv.currentValue, 0);
    return {
      month,
      label: monthShortLabel(month),
      receita,
      despesa,
      aporte,
      resultado: receita - despesa,
      patrimonio: cash + investedNow,
    };
  });
}

export function wealthSeries(
  transactions: Transaction[],
  investments: Investment[],
  months: string[],
): Array<{ label: string; patrimonio: number }> {
  return buildMonthPoints(transactions, investments, months).map((p) => ({
    label: p.label,
    patrimonio: Math.round(p.patrimonio * 100) / 100,
  }));
}

export interface CategoryTotal {
  id: string;
  label: string;
  color: string;
  total: number;
  pct: number;
}

export function categoryTotals(
  transactions: Transaction[],
  kind: "receita" | "despesa",
  monthKey?: string,
): CategoryTotal[] {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== kind) continue;
    if (monthKey && monthKeyOf(tx.date) !== monthKey) continue;
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
  }
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
  return Array.from(map.entries())
    .map(([id, value]) => {
      const cat = getCategory(id);
      return {
        id,
        label: cat?.label ?? id,
        color: cat?.color ?? "#8b949e",
        total: value,
        pct: total > 0 ? (value / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function sortTransactionsDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  const current = currentMonthKey();
  const search = filters.search.trim().toLowerCase();

  return transactions.filter((tx) => {
    if (filters.type !== "todas" && tx.type !== filters.type) return false;
    if (filters.categoryId !== "todas" && tx.categoryId !== filters.categoryId)
      return false;
    if (search && !tx.description.toLowerCase().includes(search)) return false;

    const key = monthKeyOf(tx.date);
    switch (filters.period) {
      case "mes":
        return key === current;
      case "mes-passado":
        return key === shiftMonthKey(current, -1);
      case "3meses": {
        const start = shiftMonthKey(current, -2);
        return key >= start && key <= current;
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

export const EMPTY_FILTERS: TransactionFilters = {
  search: "",
  type: "todas",
  categoryId: "todas",
  period: "tudo",
  from: "",
  to: "",
};

export function categoriesOfKind(kind: TransactionType) {
  return CATEGORIES.filter((c) => c.kind === kind);
}

export interface InvestmentSummary {
  invested: number;
  current: number;
  profit: number;
  profitPct: number;
  avgRate: number | null;
  count: number;
}

export function investmentSummary(investments: Investment[]): InvestmentSummary {
  const invested = investments.reduce((a, i) => a + i.investedAmount, 0);
  const current = investments.reduce((a, i) => a + i.currentValue, 0);
  const rates = investments
    .filter((i) => i.annualRate !== null)
    .map((i) => i.annualRate as number);
  const avgRate =
    rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  return {
    invested,
    current,
    profit: current - invested,
    profitPct: invested > 0 ? ((current - invested) / invested) * 100 : 0,
    avgRate,
    count: investments.length,
  };
}

export interface AllocationSlice {
  key: string;
  label: string;
  value: number;
  color: string;
  pct: number;
}

export function allocationByType(
  investments: Investment[],
  typeMeta: Array<{ value: string; label: string; color: string }>,
): AllocationSlice[] {
  const total = investments.reduce((a, i) => a + i.currentValue, 0);
  const map = new Map<string, number>();
  for (const inv of investments) {
    map.set(inv.type, (map.get(inv.type) ?? 0) + inv.currentValue);
  }
  return Array.from(map.entries())
    .map(([key, value]) => {
      const meta = typeMeta.find((t) => t.value === key);
      return {
        key,
        label: meta?.label ?? key,
        value,
        color: meta?.color ?? "#8b949e",
        pct: total > 0 ? (value / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.value - a.value);
}

/** Taxa de economia do mês: resultado / receitas. */
export function savingsRate(receitas: number, despesas: number): number | null {
  if (receitas <= 0) return null;
  return ((receitas - despesas) / receitas) * 100;
}

export { getCategory, monthKeyOf, todayISO };
