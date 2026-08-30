import type {
  Category,
  InvestmentType,
  PaymentMethod,
  GoalColor,
  TransactionType,
} from "../types";

export const CATEGORIES: Category[] = [
  // Receitas
  { id: "salario", label: "Salário", kind: "receita", color: "#2b8560" },
  { id: "freelance", label: "Freelance", kind: "receita", color: "#4d9e7c" },
  { id: "rendimentos", label: "Rendimentos", kind: "receita", color: "#7fbda0" },
  { id: "vendas", label: "Vendas", kind: "receita", color: "#6aa98c" },
  { id: "outras-receitas", label: "Outras receitas", kind: "receita", color: "#94b8a5" },
  // Despesas
  { id: "moradia", label: "Moradia", kind: "despesa", color: "#c96f4a" },
  { id: "alimentacao", label: "Alimentação", kind: "despesa", color: "#d9a441" },
  { id: "transporte", label: "Transporte", kind: "despesa", color: "#5b8fb9" },
  { id: "lazer", label: "Lazer", kind: "despesa", color: "#b65c8f" },
  { id: "saude", label: "Saúde", kind: "despesa", color: "#4fa3a5" },
  { id: "educacao", label: "Educação", kind: "despesa", color: "#7a6fb3" },
  { id: "assinaturas", label: "Assinaturas", kind: "despesa", color: "#8a9a5b" },
  { id: "compras", label: "Compras", kind: "despesa", color: "#c25b6d" },
  { id: "outras-despesas", label: "Outras despesas", kind: "despesa", color: "#8b949e" },
  // Investimentos
  { id: "aportes", label: "Aportes", kind: "investimento", color: "#2d69a8" },
];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function categoriesOf(kind: TransactionType): Category[] {
  return CATEGORIES.filter((c) => c.kind === kind);
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

export const INVESTMENT_TYPES: Array<{
  value: InvestmentType;
  label: string;
  color: string;
}> = [
  { value: "tesouro", label: "Tesouro Direto", color: "#2b8560" },
  { value: "cdb", label: "CDB / Renda fixa", color: "#4d9e7c" },
  { value: "acoes", label: "Ações", color: "#2d69a8" },
  { value: "fiis", label: "FIIs", color: "#7a6fb3" },
  { value: "fundos", label: "Fundos", color: "#4fa3a5" },
  { value: "cripto", label: "Criptomoedas", color: "#d9a441" },
  { value: "outro", label: "Outros", color: "#8b949e" },
];

export function investmentTypeLabel(type: InvestmentType): string {
  return INVESTMENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

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

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  receita: "Receita",
  despesa: "Despesa",
  investimento: "Investimento",
};
