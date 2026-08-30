import type {
  AccountType,
  AssetType,
  CardBrand,
  Category,
  DebtKind,
  InvestmentType,
  PaymentMethod,
  GoalColor,
  RecurrenceFrequency,
  TxKind,
  YieldMode,
} from "../types";

/** Categorias hierárquicas (raiz + subcategorias ilimitadas). IDs raiz compatíveis com v1. */
export const CATEGORIES: Category[] = [
  // ---- Receitas ----
  { id: "salario", label: "Salário", parentId: null, kind: "receita", color: "#2b8560" },
  { id: "freelance", label: "Freelance", parentId: null, kind: "receita", color: "#4d9e7c" },
  { id: "rendimentos", label: "Rendimentos", parentId: null, kind: "receita", color: "#7fbda0" },
  { id: "dividendos", label: "Dividendos", parentId: "rendimentos", kind: "receita", color: "#6aa98c" },
  { id: "juros-recebidos", label: "Juros", parentId: "rendimentos", kind: "receita", color: "#8fcbb0" },
  { id: "vendas", label: "Vendas", parentId: null, kind: "receita", color: "#6aa98c" },
  { id: "cashback", label: "Cashback", parentId: null, kind: "receita", color: "#94b8a5" },
  { id: "outras-receitas", label: "Outras receitas", parentId: null, kind: "receita", color: "#94b8a5" },
  // ---- Despesas ----
  { id: "moradia", label: "Moradia", parentId: null, kind: "despesa", color: "#c96f4a" },
  { id: "aluguel", label: "Aluguel", parentId: "moradia", kind: "despesa", color: "#c96f4a" },
  { id: "condominio", label: "Condomínio", parentId: "moradia", kind: "despesa", color: "#c96f4a" },
  { id: "energia", label: "Energia", parentId: "moradia", kind: "despesa", color: "#d98e4a" },
  { id: "agua", label: "Água", parentId: "moradia", kind: "despesa", color: "#5b8fb9" },
  { id: "internet", label: "Internet", parentId: "moradia", kind: "despesa", color: "#7a6fb3" },
  { id: "manutencao-casa", label: "Manutenção", parentId: "moradia", kind: "despesa", color: "#a8785a" },
  { id: "alimentacao", label: "Alimentação", parentId: null, kind: "despesa", color: "#d9a441" },
  { id: "mercado", label: "Mercado", parentId: "alimentacao", kind: "despesa", color: "#d9a441" },
  { id: "restaurante", label: "Restaurante", parentId: "alimentacao", kind: "despesa", color: "#e0b95e" },
  { id: "delivery", label: "Delivery", parentId: "alimentacao", kind: "despesa", color: "#c9932f" },
  { id: "lanches", label: "Lanches", parentId: "alimentacao", kind: "despesa", color: "#e6cd85" },
  { id: "transporte", label: "Transporte", parentId: null, kind: "despesa", color: "#5b8fb9" },
  { id: "combustivel", label: "Combustível", parentId: "transporte", kind: "despesa", color: "#5b8fb9" },
  { id: "uber", label: "Uber / App", parentId: "transporte", kind: "despesa", color: "#6fa3c9" },
  { id: "manutencao-veiculo", label: "Manutenção", parentId: "transporte", kind: "despesa", color: "#4a7a9e" },
  { id: "seguro-auto", label: "Seguro", parentId: "transporte", kind: "despesa", color: "#82b3d6" },
  { id: "ipva", label: "IPVA", parentId: "transporte", kind: "despesa", color: "#39658a" },
  { id: "lazer", label: "Lazer", parentId: null, kind: "despesa", color: "#b65c8f" },
  { id: "saude", label: "Saúde", parentId: null, kind: "despesa", color: "#4fa3a5" },
  { id: "educacao", label: "Educação", parentId: null, kind: "despesa", color: "#7a6fb3" },
  { id: "assinaturas", label: "Assinaturas", parentId: null, kind: "despesa", color: "#8a9a5b" },
  { id: "compras", label: "Compras", parentId: null, kind: "despesa", color: "#c25b6d" },
  { id: "impostos", label: "Impostos", parentId: null, kind: "despesa", color: "#8b6f5e" },
  { id: "reserva", label: "Reserva", parentId: null, kind: "despesa", color: "#2b8560" },
  { id: "outras-despesas", label: "Outras despesas", parentId: null, kind: "despesa", color: "#8b949e" },
  // ---- Investimentos ----
  { id: "aportes", label: "Aportes", parentId: null, kind: "investimento", color: "#2d69a8" },
  { id: "tesouro-dir", label: "Tesouro Direto", parentId: "aportes", kind: "investimento", color: "#2d69a8" },
  { id: "renda-fixa", label: "Renda fixa", parentId: "aportes", kind: "investimento", color: "#4d7fb5" },
  { id: "renda-var", label: "Renda variável", parentId: "aportes", kind: "investimento", color: "#7a6fb3" },
  { id: "cripto-cat", label: "Cripto", parentId: "aportes", kind: "investimento", color: "#d9a441" },
];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

/** Rótulo com caminho: "Moradia › Energia". */
export function categoryPath(id: string): string {
  const cat = getCategory(id);
  if (!cat) return id;
  if (!cat.parentId) return cat.label;
  const parent = getCategory(cat.parentId);
  return parent ? `${parent.label} › ${cat.label}` : cat.label;
}

export function rootCategoriesOf(kind: Category["kind"]): Category[] {
  return CATEGORIES.filter((c) => c.kind === kind && c.parentId === null && !c.archived);
}

export function subCategoriesOf(parentId: string): Category[] {
  return CATEGORIES.filter((c) => c.parentId === parentId && !c.archived);
}

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Cartão de débito" },
  { value: "credito", label: "Cartão de crédito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

export function paymentLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((p) => p.value === method)?.label ?? method;
}

export interface KindMeta {
  label: string;
  plural: string;
  color: string;
  /** Impacto no resultado do mês e no saldo da conta. */
  income: boolean;
  expense: boolean;
}

export const KIND_META: Record<TxKind, KindMeta> = {
  receita: { label: "Receita", plural: "Receitas", color: "var(--up)", income: true, expense: false },
  despesa: { label: "Despesa", plural: "Despesas", color: "var(--down)", income: false, expense: true },
  transferencia: { label: "Transferência", plural: "Transferências", color: "var(--mut)", income: false, expense: false },
  aporte: { label: "Aporte", plural: "Aportes", color: "var(--inv)", income: false, expense: false },
  resgate: { label: "Resgate", plural: "Resgates", color: "var(--inv)", income: false, expense: false },
  dividendo: { label: "Dividendo", plural: "Dividendos", color: "var(--up)", income: true, expense: false },
  juros: { label: "Juros", plural: "Juros", color: "var(--up)", income: true, expense: false },
  taxa: { label: "Taxa", plural: "Taxas", color: "var(--down)", income: false, expense: true },
  estorno: { label: "Estorno", plural: "Estornos", color: "var(--gold)", income: true, expense: false },
  ajuste: { label: "Ajuste", plural: "Ajustes", color: "var(--mut)", income: false, expense: false },
};

export const ACCOUNT_TYPES: Array<{ value: AccountType; label: string }> = [
  { value: "corrente", label: "Conta corrente" },
  { value: "salario", label: "Conta salário" },
  { value: "poupanca", label: "Poupança" },
  { value: "investimentos", label: "Conta de investimentos" },
  { value: "carteira", label: "Carteira / espécie" },
  { value: "internacional", label: "Conta internacional" },
];

export function accountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export const CARD_BRANDS: Array<{ value: CardBrand; label: string }> = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "Amex" },
  { value: "hipercard", label: "Hipercard" },
  { value: "outra", label: "Outra" },
];

export const INVESTMENT_TYPES: Array<{ value: InvestmentType; label: string; color: string; fixedIncome: boolean }> = [
  { value: "tesouro-selic", label: "Tesouro Selic", color: "#2b8560", fixedIncome: true },
  { value: "tesouro-ipca", label: "Tesouro IPCA+", color: "#1d6e4e", fixedIncome: true },
  { value: "cdb", label: "CDB", color: "#4d9e7c", fixedIncome: true },
  { value: "lci", label: "LCI", color: "#7fbda0", fixedIncome: true },
  { value: "lca", label: "LCA", color: "#94c9ae", fixedIncome: true },
  { value: "acoes", label: "Ações", color: "#2d69a8", fixedIncome: false },
  { value: "fiis", label: "FIIs", color: "#7a6fb3", fixedIncome: false },
  { value: "etf", label: "ETFs", color: "#4fa3a5", fixedIncome: false },
  { value: "fundos", label: "Fundos", color: "#5b8fb9", fixedIncome: false },
  { value: "previdencia", label: "Previdência", color: "#8a9a5b", fixedIncome: false },
  { value: "cripto", label: "Criptomoedas", color: "#d9a441", fixedIncome: false },
  { value: "internacional", label: "Internacional", color: "#b65c8f", fixedIncome: false },
  { value: "outro", label: "Outros", color: "#8b949e", fixedIncome: false },
];

export function investmentTypeMeta(type: InvestmentType) {
  return INVESTMENT_TYPES.find((t) => t.value === type) ?? INVESTMENT_TYPES[INVESTMENT_TYPES.length - 1];
}

export const YIELD_MODES: Array<{ value: YieldMode; label: string; hint: string }> = [
  { value: "manual", label: "Manual", hint: "Acompanhar apenas o valor informado" },
  { value: "fixa", label: "Taxa fixa a.a.", hint: "Ex.: 12% ao ano" },
  { value: "cdi", label: "% do CDI", hint: "Ex.: 110% do CDI" },
  { value: "selic", label: "% da Selic", hint: "Ex.: 100% da Selic" },
  { value: "ipca", label: "IPCA + taxa", hint: "Ex.: IPCA + 6% a.a." },
];

export const ASSET_TYPES: Array<{ value: AssetType; label: string }> = [
  { value: "carro", label: "Carro" },
  { value: "moto", label: "Moto" },
  { value: "imovel", label: "Imóvel" },
  { value: "terreno", label: "Terreno" },
  { value: "equipamento", label: "Equipamento" },
  { value: "eletronico", label: "Eletrônico" },
  { value: "outro", label: "Outro" },
];

export const DEBT_KINDS: Array<{ value: DebtKind; label: string }> = [
  { value: "divida", label: "Dívida / empréstimo" },
  { value: "financiamento", label: "Financiamento" },
  { value: "consorcio", label: "Consórcio" },
];

export const RECURRENCE_FREQUENCIES: Array<{ value: RecurrenceFrequency; label: string }> = [
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

export const GOAL_COLORS: Array<{ value: GoalColor; label: string; hex: string }> = [
  { value: "pine", label: "Verde", hex: "#2b8560" },
  { value: "gold", label: "Âmbar", hex: "#d9a441" },
  { value: "inv", label: "Azul", hex: "#2d69a8" },
  { value: "teal", label: "Verde-água", hex: "#4fa3a5" },
  { value: "rose", label: "Rosa", hex: "#c25b6d" },
];

export function goalColorHex(color: GoalColor): string {
  return GOAL_COLORS.find((c) => c.value === color)?.hex ?? "#2b8560";
}
