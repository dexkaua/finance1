/**
 * Modelo de domínio v2 — plataforma completa de controle financeiro.
 * Fonte única de verdade: contas + transações. Saldos, faturas, limites,
 * patrimônio e resultados são sempre DERIVADOS, nunca armazenados.
 */

export type Page =
  | "dashboard"
  | "movimentacoes"
  | "contas"
  | "cartoes"
  | "investimentos"
  | "patrimonio"
  | "dividas"
  | "metas"
  | "orcamentos"
  | "recorrencias"
  | "relatorios"
  | "simulacoes"
  | "assistente"
  | "saude"
  | "automacao"
  | "configuracoes";

/* ------------------------------ Categorias ------------------------------ */

export interface Category {
  id: string;
  label: string;
  /** null = categoria raiz */
  parentId: string | null;
  kind: "receita" | "despesa" | "investimento";
  color: string;
  archived?: boolean;
}

/* ------------------------------- Contas -------------------------------- */

export type AccountType =
  | "corrente"
  | "salario"
  | "poupanca"
  | "investimentos"
  | "carteira"
  | "internacional";

export type Currency = "BRL" | "USD" | "EUR";

export interface Account {
  id: string;
  institution: string;
  agency?: string;
  number?: string;
  type: AccountType;
  currency: Currency;
  /** Saldo na abertura — o saldo atual é derivado das movimentações. */
  initialBalance: number;
  /** Limite de cheque especial (informativo). */
  limit?: number;
  holder?: string;
  joint: boolean;
  openedAt?: string;
  closedAt?: string | null;
  note?: string;
  /** Saldo informado pelo extrato do banco, usado na reconciliação. */
  statementBalance?: number | null;
}

export type AccountInput = Omit<Account, "id">;

/* ---------------------------- Transações ------------------------------- */

export type TxKind =
  | "receita"
  | "despesa"
  | "transferencia"
  | "aporte"
  | "resgate"
  | "dividendo"
  | "juros"
  | "taxa"
  | "estorno"
  | "ajuste";

export type TxStatus = "criada" | "alterada" | "corrigida" | "estornada" | "cancelada";

export type PaymentMethod =
  | "pix"
  | "debito"
  | "credito"
  | "dinheiro"
  | "boleto"
  | "transferencia";

export interface AuditEntry {
  at: string;
  action: TxStatus | "reativada";
  reason?: string;
  /** Snapshot legível dos campos alterados (antes → depois). */
  changes?: Array<{ field: string; from: string; to: string }>;
}

export interface Transaction {
  id: string;
  kind: TxKind;
  description: string;
  /** Sempre positivo. */
  amount: number;
  categoryId: string;
  subcategoryId?: string;
  /** YYYY-MM-DD */
  date: string;
  accountId: string;
  /** Conta de destino em transferências. */
  toAccountId?: string;
  /** Presente em compras no crédito e pagamentos de fatura. */
  cardId?: string;
  investmentId?: string;
  debtId?: string;
  recurrenceId?: string;
  paymentMethod: PaymentMethod;
  status: TxStatus;
  installmentGroup?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  person?: string;
  project?: string;
  note?: string;
  source: "manual" | "importacao" | "automacao" | "recorrencia" | "parcelamento" | "fatura" | "migracao";
  direction?: "in" | "out";
  audit: AuditEntry[];
  createdAt: string;
}

export type TransactionInput = Omit<Transaction, "id" | "createdAt" | "audit" | "status" | "source"> & {
  source?: Transaction["source"];
};

/* ------------------------------- Cartões ------------------------------- */

export type CardBrand = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "outra";

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  brand: CardBrand;
  limit: number;
  closingDay: number;
  dueDay: number;
  holder?: string;
  additional: boolean;
  annualFee: number;
  benefits?: string;
  cashbackPct?: number;
  pointsProgram?: string;
  /** Conta usada para pagar a fatura. */
  accountId: string;
  note?: string;
}

export type CreditCardInput = Omit<CreditCard, "id">;

/** Ajustes da fatura (juros, multa, IOF, tarifas) — persistidos por cartão/mês. */
export interface InvoiceExtras {
  id: string;
  cardId: string;
  /** YYYY-MM */
  month: string;
  juros: number;
  multa: number;
  iof: number;
  tarifas: number;
}

export interface InvoicePayment {
  id: string;
  cardId: string;
  month: string;
  date: string;
  amount: number;
  accountId: string;
}

export type InvoiceStatus = "aberta" | "fechada" | "paga" | "parcialmente_paga" | "vencida";

export interface Invoice {
  cardId: string;
  month: string;
  closingDate: string;
  dueDate: string;
  purchases: Transaction[];
  extrasTotal: number;
  total: number;
  paid: number;
  remaining: number;
  status: InvoiceStatus;
  payments: InvoicePayment[];
}

/* ---------------------------- Investimentos ---------------------------- */

export type InvestmentType =
  | "tesouro-selic"
  | "tesouro-ipca"
  | "cdb"
  | "lci"
  | "lca"
  | "acoes"
  | "fiis"
  | "etf"
  | "fundos"
  | "previdencia"
  | "cripto"
  | "internacional"
  | "outro";

export type YieldMode = "manual" | "fixa" | "cdi" | "selic" | "ipca";

export interface YieldConfig {
  mode: YieldMode;
  /** % a.a. (fixa/ipca) ou % do indexador (cdi/selic). 0 = manual/acompanhar posição. */
  rate: number;
}

export interface MergedRecord {
  id: string;
  name: string;
  institution: string;
  investedAmount: number;
  currentValue: number;
  quantity: number | null;
  mergedAt: string;
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  institution: string;
  broker?: string;
  quantity: number | null;
  avgPrice: number | null;
  currentPrice: number | null;
  investedAmount: number;
  currentValue: number;
  fees: number;
  taxes: number;
  note?: string;
  /** Data de compra/início. */
  startDate: string;
  maturityDate?: string | null;
  yield: YieldConfig;
  /** Rastreabilidade de agrupamentos (os registros originais nunca se perdem). */
  mergedFrom?: MergedRecord[];
}

export type InvestmentInput = Omit<Investment, "id" | "mergedFrom">;

/* ------------------------------ Dívidas -------------------------------- */

export type DebtKind = "divida" | "financiamento" | "consorcio";

export interface DebtPayment {
  id: string;
  date: string;
  amount: number;
  kind: "parcela" | "amortizacao" | "antecipacao" | "multa";
}

export interface ConsorcioInfo {
  administrator: string;
  creditLetter: number;
  adjustmentPct: number;
  adminFeePct: number;
  insurance: number;
  bid: number;
  contemplated: boolean;
}

export interface Debt {
  id: string;
  kind: DebtKind;
  creditor: string;
  purpose?: string;
  originalAmount: number;
  balance: number;
  annualRate: number;
  cet?: number | null;
  totalInstallments: number;
  paidInstallments: number;
  monthlyPayment: number;
  dueDay: number;
  startDate: string;
  payments: DebtPayment[];
  note?: string;
  consorcio?: ConsorcioInfo;
}

export type DebtInput = Omit<Debt, "id" | "payments">;

/* --------------------------- Bens e metas ------------------------------ */

export type AssetType = "carro" | "moto" | "imovel" | "terreno" | "equipamento" | "eletronico" | "outro";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value: number;
  purchaseValue?: number;
  purchaseDate?: string;
  note?: string;
}

export type AssetInput = Omit<Asset, "id">;

export type GoalColor = "pine" | "gold" | "inv" | "teal" | "rose";
export type GoalPriority = "alta" | "media" | "baixa";
export type GoalMode = "prazo" | "aporte";

export interface Goal {
  id: string;
  name: string;
  purpose: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: GoalColor;
  priority: GoalPriority;
  mode: GoalMode;
  /** No modo "aporte": valor mensal fixo. */
  monthlyContribution?: number;
  accountId?: string;
  investmentId?: string;
}

export type GoalInput = Omit<Goal, "id">;

/* ------------------------- Orçamentos e recorr. ------------------------ */

export interface Budget {
  id: string;
  categoryId: string;
  monthlyLimit: number;
}

export type BudgetInput = Omit<Budget, "id">;

export type RecurrenceFrequency =
  | "semanal"
  | "quinzenal"
  | "mensal"
  | "trimestral"
  | "semestral"
  | "anual";

export interface Recurrence {
  id: string;
  description: string;
  categoryId: string;
  accountId: string;
  cardId?: string;
  amount: number;
  frequency: RecurrenceFrequency;
  nextDate: string;
  active: boolean;
  lastGenerated?: string;
}

export type RecurrenceInput = Omit<Recurrence, "id" | "lastGenerated">;

/* --------------------------- Regras e autom. --------------------------- */

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  match: { field: "descricao"; operator: "contem" | "comeca" | "igual"; value: string };
  action: { type: "categoria"; categoryId: string };
}

export type RuleInput = Omit<Rule, "id">;

export interface AutomationSplit {
  id: string;
  label: string;
  pct: number;
  kind: "aporte" | "despesa";
  categoryId: string;
  accountId?: string;
}

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  triggerCategoryId: string;
  splits: AutomationSplit[];
}

export type AutomationInput = Omit<Automation, "id">;

/* ----------------------------- Settings -------------------------------- */

export interface BenchmarkRates {
  cdi: number;
  selic: number;
  ipca: number;
  ibov: number;
  sp500: number;
}

export interface Settings {
  currency: Currency;
  benchmarks: BenchmarkRates;
  dashboardWidgets: Record<string, boolean>;
  ignoredGroups: string[];
  lastScore: number | null;
  /** Nome informado no primeiro acesso — null enquanto não perguntado. */
  userName: string | null;
}

/* ------------------------------ App data ------------------------------- */

export interface AppData {
  schemaVersion: number;
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
}

/* ------------------------------- Filtros ------------------------------- */

export type PeriodPreset = "tudo" | "mes" | "mes-passado" | "3meses" | "ano" | "personalizado";

export interface TransactionFilters {
  search: string;
  kind: TxKind | "todas";
  categoryId: string | "todas";
  accountId: string | "todas";
  period: PeriodPreset;
  from: string;
  to: string;
  includeInactive: boolean;
}

export type ToastKind = "success" | "error" | "info";
