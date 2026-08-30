/** Tipos de domínio da aplicação Controle Financeiro. */

export type TransactionType = "receita" | "despesa" | "investimento";

export type PaymentMethod =
  | "pix"
  | "debito"
  | "credito"
  | "dinheiro"
  | "boleto"
  | "transferencia";

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  /** Sempre positivo; o sinal é derivado do tipo. */
  amount: number;
  categoryId: string;
  /** Formato YYYY-MM-DD. */
  date: string;
  paymentMethod: PaymentMethod;
  /** ISO datetime de criação. */
  createdAt: string;
}

export type TransactionInput = Omit<Transaction, "id" | "createdAt">;

export type InvestmentType =
  | "tesouro"
  | "cdb"
  | "acoes"
  | "fiis"
  | "fundos"
  | "cripto"
  | "outro";

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  institution: string;
  investedAmount: number;
  currentValue: number;
  /** Rentabilidade anual estimada em % — null quando variável/desconhecida. */
  annualRate: number | null;
  /** Formato YYYY-MM-DD. */
  startDate: string;
}

export type InvestmentInput = Omit<Investment, "id">;

export type GoalColor = "pine" | "gold" | "inv" | "teal" | "rose";

export interface Goal {
  id: string;
  name: string;
  purpose: string;
  targetAmount: number;
  currentAmount: number;
  /** Formato YYYY-MM-DD. */
  deadline: string;
  color: GoalColor;
}

export type GoalInput = Omit<Goal, "id">;

export interface Category {
  id: string;
  label: string;
  kind: TransactionType;
  /** Cor hex usada em gráficos e badges. */
  color: string;
}

export interface AppData {
  transactions: Transaction[];
  investments: Investment[];
  goals: Goal[];
}

export type Page =
  | "dashboard"
  | "movimentacoes"
  | "investimentos"
  | "metas"
  | "relatorios";

export type PeriodPreset =
  | "tudo"
  | "mes"
  | "mes-passado"
  | "3meses"
  | "ano"
  | "personalizado";

export interface TransactionFilters {
  search: string;
  type: TransactionType | "todas";
  categoryId: string | "todas";
  period: PeriodPreset;
  from: string;
  to: string;
}

/** Ponto da série mensal usada nos gráficos. */
export interface MonthPoint {
  month: string;
  label: string;
  receita: number;
  despesa: number;
  aporte: number;
  resultado: number;
  patrimonio: number;
}

export type ToastKind = "success" | "error" | "info";
