import { parseCurrencyInput } from "./format";

export type FieldErrors = Record<string, string>;

export interface TransactionFormValues {
  kind: string;
  description: string;
  amount: string;
  categoryId: string;
  subcategoryId: string;
  date: string;
  paymentMethod: string;
  accountId: string;
  toAccountId: string;
  cardId: string;
  installments: string;
}

export function validateTransaction(v: TransactionFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (v.description.trim().length < 3) {
    errors.description = "Descreva com pelo menos 3 caracteres.";
  }
  const amount = parseCurrencyInput(v.amount);
  if (amount === null) errors.amount = "Informe um valor válido, ex.: 120,50.";
  else if (amount <= 0) errors.amount = "O valor deve ser maior que zero.";
  if (!v.date) errors.date = "Informe a data.";
  if (!v.categoryId) errors.categoryId = "Escolha uma categoria.";
  if (!v.paymentMethod) errors.paymentMethod = "Escolha a forma de pagamento.";
  if (!v.accountId) errors.accountId = "Escolha a conta.";
  if (v.kind === "transferencia" && !v.toAccountId) {
    errors.toAccountId = "Informe a conta de destino.";
  }
  if (v.kind === "transferencia" && v.toAccountId && v.toAccountId === v.accountId) {
    errors.toAccountId = "Destino deve ser diferente da origem.";
  }
  if (v.kind === "despesa" && v.cardId && v.installments) {
    const n = Number(v.installments);
    if (!Number.isInteger(n) || n < 1 || n > 120) {
      errors.installments = "Parcelas entre 1 e 120.";
    }
  }
  return errors;
}

export interface InvestmentFormValues {
  name: string;
  type: string;
  institution: string;
  broker: string;
  investedAmount: string;
  currentValue: string;
  quantity: string;
  avgPrice: string;
  currentPrice: string;
  fees: string;
  taxes: string;
  yieldMode: string;
  yieldRate: string;
  startDate: string;
  maturityDate: string;
}

export function validateInvestment(v: InvestmentFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (v.name.trim().length < 2) errors.name = "Informe o nome do ativo.";
  if (!v.type) errors.type = "Escolha o tipo.";
  if (v.institution.trim().length < 2) errors.institution = "Informe a instituição.";
  const invested = parseCurrencyInput(v.investedAmount);
  if (invested === null || invested <= 0) errors.investedAmount = "Informe o valor investido.";
  const current = parseCurrencyInput(v.currentValue);
  if (current === null || current < 0) errors.currentValue = "Informe o valor atual (mínimo 0).";
  for (const field of ["quantity", "avgPrice", "currentPrice", "fees", "taxes"] as const) {
    if (v[field].trim() !== "") {
      const n = Number(v[field].replace(",", "."));
      if (!Number.isFinite(n) || n < 0) errors[field] = "Valor inválido.";
    }
  }
  if (v.yieldMode !== "manual") {
    const rate = Number(v.yieldRate.replace(",", "."));
    if (v.yieldRate.trim() === "" || !Number.isFinite(rate)) {
      errors.yieldRate = "Informe a taxa.";
    }
  }
  if (!v.startDate) errors.startDate = "Informe a data de compra.";
  if (v.maturityDate && v.startDate && v.maturityDate < v.startDate) {
    errors.maturityDate = "Vencimento antes da compra.";
  }
  return errors;
}

export interface GoalFormValues {
  name: string;
  purpose: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  monthlyContribution: string;
  mode: string;
}

export function validateGoal(v: GoalFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (v.name.trim().length < 3) errors.name = "Dê um nome à meta.";
  const target = parseCurrencyInput(v.targetAmount);
  if (target === null || target <= 0) errors.targetAmount = "Informe o valor objetivo.";
  const current = parseCurrencyInput(v.currentAmount);
  if (current === null || current < 0) errors.currentAmount = "Informe o valor acumulado (mínimo 0).";
  if (!v.deadline) errors.deadline = "Informe o prazo.";
  if (v.mode === "aporte") {
    const monthly = parseCurrencyInput(v.monthlyContribution);
    if (monthly === null || monthly <= 0) errors.monthlyContribution = "Informe o aporte mensal.";
  }
  return errors;
}

export function validateAccount(v: {
  institution: string;
  type: string;
  initialBalance: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (v.institution.trim().length < 2) errors.institution = "Informe a instituição.";
  if (!v.type) errors.type = "Escolha o tipo.";
  const balance = parseCurrencyInput(v.initialBalance);
  if (balance === null) errors.initialBalance = "Informe o saldo inicial.";
  return errors;
}

export function validateCard(v: {
  name: string;
  bank: string;
  limit: string;
  closingDay: string;
  dueDay: string;
  accountId: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (v.name.trim().length < 2) errors.name = "Informe o nome do cartão.";
  if (v.bank.trim().length < 2) errors.bank = "Informe o banco.";
  const limit = parseCurrencyInput(v.limit);
  if (limit === null || limit <= 0) errors.limit = "Informe o limite.";
  const closing = Number(v.closingDay);
  const due = Number(v.dueDay);
  if (!closing || closing < 1 || closing > 31) errors.closingDay = "Dia entre 1 e 31.";
  if (!due || due < 1 || due > 31) errors.dueDay = "Dia entre 1 e 31.";
  if (!v.accountId) errors.accountId = "Escolha a conta que paga a fatura.";
  return errors;
}

export function validateDebt(v: {
  creditor: string;
  originalAmount: string;
  balance: string;
  annualRate: string;
  monthlyPayment: string;
  totalInstallments: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (v.creditor.trim().length < 2) errors.creditor = "Informe o credor.";
  const original = parseCurrencyInput(v.originalAmount);
  if (original === null || original <= 0) errors.originalAmount = "Informe o valor original.";
  const balance = parseCurrencyInput(v.balance);
  if (balance === null || balance < 0) errors.balance = "Informe o saldo devedor.";
  const rate = Number(v.annualRate.replace(",", "."));
  if (v.annualRate.trim() === "" || !Number.isFinite(rate) || rate < 0) {
    errors.annualRate = "Informe os juros anuais.";
  }
  const payment = parseCurrencyInput(v.monthlyPayment);
  if (payment === null || payment <= 0) errors.monthlyPayment = "Informe a parcela mensal.";
  const total = Number(v.totalInstallments);
  if (!Number.isInteger(total) || total < 1) errors.totalInstallments = "Número de parcelas inválido.";
  return errors;
}

export function validateBudget(v: { categoryId: string; monthlyLimit: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!v.categoryId) errors.categoryId = "Escolha a categoria.";
  const limit = parseCurrencyInput(v.monthlyLimit);
  if (limit === null || limit <= 0) errors.monthlyLimit = "Informe o limite mensal.";
  return errors;
}
