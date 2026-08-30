/**
 * "API" da aplicação. Hoje lê/grava no armazenamento local com latência
 * simulada (para exercitar estados de loading); amanhã pode apontar para
 * HTTP mantendo as mesmas assinaturas assíncronas.
 *
 * Ordem de carga: v2 existente → carrega; legado v1 → migra; nenhum → seed.
 */

import type {
  Account,
  AppData,
  Asset,
  Automation,
  Budget,
  CreditCard,
  Debt,
  Goal,
  Investment,
  InvoiceExtras,
  InvoicePayment,
  Recurrence,
  Rule,
  Settings,
  Transaction,
} from "../types";
import { DEFAULT_SETTINGS, emptyAppData } from "../data/seed";
import { hasLegacyData, hasV2Data, migrateV1ToV2 } from "./migration";
import { storage, STORAGE_KEYS } from "./storage";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const simulatedLatency = () => delay(300 + Math.random() * 250);

function readCollection<T>(key: string): T[] {
  return storage.read<T[]>(key) ?? [];
}

export async function fetchAppData(): Promise<AppData> {
  await simulatedLatency();

  if (!hasV2Data() && hasLegacyData()) {
    const result = migrateV1ToV2();
    return {
      schemaVersion: 2,
      transactions: result.transactions,
      accounts: [result.account],
      cards: [],
      investments: result.investments,
      debts: [],
      goals: result.goals,
      budgets: [],
      assets: [],
      recurrences: [],
      rules: [],
      automations: [],
      invoiceExtras: [],
      invoicePayments: [],
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  if (!hasV2Data()) {
    // Instalação nova: o sistema inicia COMPLETAMENTE VAZIO.
    // Nenhum dado fictício é criado — o usuário começa do zero.
    const empty = emptyAppData(DEFAULT_SETTINGS);
    persistAll(empty);
    storage.write(STORAGE_KEYS.seeded, true);
    storage.write(STORAGE_KEYS.schemaVersion, 2);
    return empty;
  }

  return {
    schemaVersion: storage.read<number>(STORAGE_KEYS.schemaVersion) ?? 2,
    transactions: readCollection<Transaction>(STORAGE_KEYS.transactions),
    accounts: readCollection<Account>(STORAGE_KEYS.accounts),
    cards: readCollection<CreditCard>(STORAGE_KEYS.cards),
    investments: readCollection<Investment>(STORAGE_KEYS.investments),
    debts: readCollection<Debt>(STORAGE_KEYS.debts),
    goals: readCollection<Goal>(STORAGE_KEYS.goals),
    budgets: readCollection<Budget>(STORAGE_KEYS.budgets),
    assets: readCollection<Asset>(STORAGE_KEYS.assets),
    recurrences: readCollection<Recurrence>(STORAGE_KEYS.recurrences),
    rules: readCollection<Rule>(STORAGE_KEYS.rules),
    automations: readCollection<Automation>(STORAGE_KEYS.automations),
    invoiceExtras: readCollection<InvoiceExtras>(STORAGE_KEYS.invoiceExtras),
    invoicePayments: readCollection<InvoicePayment>(STORAGE_KEYS.invoicePayments),
    settings: {
      ...DEFAULT_SETTINGS,
      ...(storage.read<Settings>(STORAGE_KEYS.settings) ?? {}),
    },
  };
}

export function persistAll(data: AppData): void {
  storage.write(STORAGE_KEYS.transactions, data.transactions);
  storage.write(STORAGE_KEYS.accounts, data.accounts);
  storage.write(STORAGE_KEYS.cards, data.cards);
  storage.write(STORAGE_KEYS.investments, data.investments);
  storage.write(STORAGE_KEYS.debts, data.debts);
  storage.write(STORAGE_KEYS.goals, data.goals);
  storage.write(STORAGE_KEYS.budgets, data.budgets);
  storage.write(STORAGE_KEYS.assets, data.assets);
  storage.write(STORAGE_KEYS.recurrences, data.recurrences);
  storage.write(STORAGE_KEYS.rules, data.rules);
  storage.write(STORAGE_KEYS.automations, data.automations);
  storage.write(STORAGE_KEYS.invoiceExtras, data.invoiceExtras);
  storage.write(STORAGE_KEYS.invoicePayments, data.invoicePayments);
  storage.write(STORAGE_KEYS.settings, data.settings);
}

export async function persistCollection(key: string, items: unknown): Promise<void> {
  storage.write(key, items);
  await delay(60);
}

/* ------------------------------ Tema ----------------------------------- */

export type Theme = "light" | "dark";

export function readThemePreference(): Theme {
  const stored = storage.read<string>(STORAGE_KEYS.theme);
  if (stored === "light" || stored === "dark") return stored;
  const prefersLight =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

export function persistThemePreference(theme: Theme): void {
  try {
    storage.write(STORAGE_KEYS.theme, theme);
  } catch {
    // Tema é preferencial; falha de gravação não deve quebrar a UI.
  }
}
