/**
 * "API" da aplicação. Hoje lê/grava no armazenamento local com uma latência
 * simulada (para exercitar estados de loading); amanhã pode apontar para HTTP
 * mantendo as mesmas assinaturas assíncronas.
 */
import type { AppData, Goal, Investment, Transaction } from "../types";
import { buildSeedData } from "../data/seed";
import { storage, STORAGE_KEYS } from "./storage";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const simulatedLatency = () => delay(300 + Math.random() * 300);

export async function fetchAppData(): Promise<AppData> {
  await simulatedLatency();
  const seeded = storage.read<boolean>(STORAGE_KEYS.seeded);

  if (!seeded) {
    const seed = buildSeedData();
    storage.write(STORAGE_KEYS.transactions, seed.transactions);
    storage.write(STORAGE_KEYS.investments, seed.investments);
    storage.write(STORAGE_KEYS.goals, seed.goals);
    storage.write(STORAGE_KEYS.seeded, true);
    return seed;
  }

  return {
    transactions: storage.read<Transaction[]>(STORAGE_KEYS.transactions) ?? [],
    investments: storage.read<Investment[]>(STORAGE_KEYS.investments) ?? [],
    goals: storage.read<Goal[]>(STORAGE_KEYS.goals) ?? [],
  };
}

export async function persistTransactions(items: Transaction[]): Promise<void> {
  storage.write(STORAGE_KEYS.transactions, items);
  await delay(80);
}

export async function persistInvestments(items: Investment[]): Promise<void> {
  storage.write(STORAGE_KEYS.investments, items);
  await delay(80);
}

export async function persistGoals(items: Goal[]): Promise<void> {
  storage.write(STORAGE_KEYS.goals, items);
  await delay(80);
}

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
