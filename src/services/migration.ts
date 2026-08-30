/**
 * Migração segura v1 → v2.
 *
 * - NUNCA apaga as chaves legadas (cf1:*): elas permanecem como backup.
 * - Converte transações v1 (receita/despesa/investimento) para o modelo v2,
 *   vinculando-as à conta principal criada automaticamente.
 * - Converte investimentos e metas adicionando os novos campos com defaults.
 * - É idempotente: só roda quando cf2:schemaVersion não existe.
 */

import type { Account, Goal, Investment, Transaction } from "../types";
import { LEGACY_KEYS, STORAGE_KEYS, storage } from "./storage";
import { uid } from "../utils/id";

interface LegacyTransactionV1 {
  id: string;
  type: "receita" | "despesa" | "investimento";
  description: string;
  amount: number;
  categoryId: string;
  date: string;
  paymentMethod: Transaction["paymentMethod"];
  createdAt: string;
}

interface LegacyInvestmentV1 {
  id: string;
  name: string;
  type: string;
  institution: string;
  investedAmount: number;
  currentValue: number;
  annualRate: number | null;
  startDate: string;
}

interface LegacyGoalV1 {
  id: string;
  name: string;
  purpose: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: Goal["color"];
}

const V1_TYPE_MAP: Record<string, Investment["type"]> = {
  tesouro: "tesouro-selic",
  cdb: "cdb",
  acoes: "acoes",
  fiis: "fiis",
  fundos: "fundos",
  cripto: "cripto",
  outro: "outro",
};

export const DEFAULT_ACCOUNT_ID = "acc-principal";

export function buildDefaultAccount(): Account {
  return {
    id: DEFAULT_ACCOUNT_ID,
    institution: "Conta Principal",
    type: "corrente",
    currency: "BRL",
    initialBalance: 0,
    joint: false,
    note: "Conta criada automaticamente na migração para o v2.",
  };
}

export interface MigrationResult {
  migratedFromV1: boolean;
  transactions: Transaction[];
  investments: Investment[];
  goals: Goal[];
  account: Account;
}

export function hasLegacyData(): boolean {
  return Boolean(storage.read(LEGACY_KEYS.seeded)) || Boolean(storage.read(LEGACY_KEYS.transactions));
}

export function hasV2Data(): boolean {
  return storage.read<number>(STORAGE_KEYS.schemaVersion) !== null;
}

export function migrateV1ToV2(): MigrationResult {
  const legacyTx = storage.read<LegacyTransactionV1[]>(LEGACY_KEYS.transactions) ?? [];
  const legacyInv = storage.read<LegacyInvestmentV1[]>(LEGACY_KEYS.investments) ?? [];
  const legacyGoals = storage.read<LegacyGoalV1[]>(LEGACY_KEYS.goals) ?? [];
  const account = buildDefaultAccount();

  const transactions: Transaction[] = legacyTx.map((tx) => ({
    id: tx.id,
    kind: tx.type === "investimento" ? "aporte" : tx.type,
    description: tx.description,
    amount: tx.amount,
    categoryId: tx.type === "investimento" ? "aportes" : tx.categoryId,
    date: tx.date,
    accountId: account.id,
    paymentMethod: tx.paymentMethod,
    status: "criada",
    source: "migracao",
    audit: [
      {
        at: new Date().toISOString(),
        action: "criada",
        reason: "Migrado automaticamente do formato v1 (dados preservados).",
      },
    ],
    createdAt: tx.createdAt,
  }));

  const investments: Investment[] = legacyInv.map((inv) => ({
    id: inv.id,
    name: inv.name,
    type: V1_TYPE_MAP[inv.type] ?? "outro",
    institution: inv.institution,
    quantity: null,
    avgPrice: null,
    currentPrice: null,
    investedAmount: inv.investedAmount,
    currentValue: inv.currentValue,
    fees: 0,
    taxes: 0,
    startDate: inv.startDate,
    maturityDate: null,
    yield: {
      mode: inv.annualRate === null ? "manual" : "fixa",
      rate: inv.annualRate ?? 0,
    },
  }));

  const goals: Goal[] = legacyGoals.map((goal) => ({
    ...goal,
    priority: "media",
    mode: "prazo",
  }));

  // Grava as coleções convertidas nas novas chaves (as antigas permanecem intactas).
  storage.write(STORAGE_KEYS.accounts, [account]);
  storage.write(STORAGE_KEYS.transactions, transactions);
  storage.write(STORAGE_KEYS.investments, investments);
  storage.write(STORAGE_KEYS.goals, goals);
  storage.write(STORAGE_KEYS.schemaVersion, 2);

  return { migratedFromV1: true, transactions, investments, goals, account };
}

/** Gera um id estável e curto para entidades novas. */
export function newId(prefix: string): string {
  return uid(prefix);
}
