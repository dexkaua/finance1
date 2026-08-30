import { parseCurrencyInput } from "./format";

export type FieldErrors = Record<string, string>;

export interface TransactionFormValues {
  type: string;
  description: string;
  amount: string;
  categoryId: string;
  date: string;
  paymentMethod: string;
}

export function validateTransaction(v: TransactionFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (v.description.trim().length < 3) {
    errors.description = "Descreva com pelo menos 3 caracteres.";
  }
  const amount = parseCurrencyInput(v.amount);
  if (amount === null) {
    errors.amount = "Informe um valor válido, ex.: 120,50.";
  } else if (amount <= 0) {
    errors.amount = "O valor deve ser maior que zero.";
  }
  if (!v.date) {
    errors.date = "Informe a data.";
  }
  if (!v.categoryId) {
    errors.categoryId = "Escolha uma categoria.";
  }
  if (!v.paymentMethod) {
    errors.paymentMethod = "Escolha a forma de pagamento.";
  }
  return errors;
}

export interface InvestmentFormValues {
  name: string;
  type: string;
  institution: string;
  investedAmount: string;
  currentValue: string;
  annualRate: string;
  startDate: string;
}

export function validateInvestment(v: InvestmentFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (v.name.trim().length < 3) {
    errors.name = "Informe o nome do investimento.";
  }
  if (!v.type) {
    errors.type = "Escolha o tipo.";
  }
  if (v.institution.trim().length < 2) {
    errors.institution = "Informe a instituição.";
  }
  const invested = parseCurrencyInput(v.investedAmount);
  if (invested === null || invested <= 0) {
    errors.investedAmount = "Informe o valor investido.";
  }
  const current = parseCurrencyInput(v.currentValue);
  if (current === null || current < 0) {
    errors.currentValue = "Informe o valor atual (mínimo 0).";
  }
  if (v.annualRate.trim() !== "") {
    const rate = Number(v.annualRate.replace(",", "."));
    if (!Number.isFinite(rate)) {
      errors.annualRate = "Rentabilidade inválida.";
    }
  }
  if (!v.startDate) {
    errors.startDate = "Informe a data de início.";
  }
  return errors;
}

export interface GoalFormValues {
  name: string;
  purpose: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
}

export function validateGoal(v: GoalFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (v.name.trim().length < 3) {
    errors.name = "Dê um nome à meta.";
  }
  const target = parseCurrencyInput(v.targetAmount);
  if (target === null || target <= 0) {
    errors.targetAmount = "Informe o valor objetivo.";
  }
  const current = parseCurrencyInput(v.currentAmount);
  if (current === null || current < 0) {
    errors.currentAmount = "Informe o valor acumulado (mínimo 0).";
  }
  if (!v.deadline) {
    errors.deadline = "Informe o prazo.";
  }
  return errors;
}
