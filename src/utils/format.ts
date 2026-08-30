/** Formatação de moeda (multi-moeda), números e parsing de entradas monetárias. */

import type { Currency } from "../types";

let activeCurrency: Currency = "BRL";

/** Define a moeda exibida em toda a aplicação (persistida em settings). */
export function setActiveCurrency(currency: Currency): void {
  activeCurrency = currency;
}

export function getActiveCurrency(): Currency {
  return activeCurrency;
}

const formatters = new Map<Currency, Intl.NumberFormat>();

function formatterFor(currency: Currency): Intl.NumberFormat {
  let fmt = formatters.get(currency);
  if (!fmt) {
    fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency });
    formatters.set(currency, fmt);
  }
  return fmt;
}

export function formatBRL(value: number): string {
  return formatterFor(activeCurrency).format(value);
}

export function formatBRLCompact(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: activeCurrency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

export function formatSignedBRL(value: number): string {
  const abs = formatBRL(Math.abs(value));
  if (value > 0) return `+ ${abs}`;
  if (value < 0) return `− ${abs}`;
  return abs;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })}%`;
}

/** Converte texto digitado ("1.234,56", "1234.56", "R$ 90") em número. */
export function parseCurrencyInput(raw: string): number | null {
  const cleaned = raw.replace(/[R$US$\s€]/g, "");
  if (cleaned === "") return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Sanitiza um nome para uso em nomes de arquivo: remove acentos, espaços
 * viram "_" e caracteres inválidos são descartados.
 * Ex.: "João da Silva" → "Joao_da_Silva".
 */
export function sanitizeFileName(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return clean || "usuario";
}

/**
 * Nome de backup no padrão: backup.fin.NOME.DD-MM-AAAA_HH-mm.json
 * O horário evita colisões quando houver mais de um backup no mesmo dia.
 */
export function backupFileName(userName: string | null, date: Date = new Date()): string {
  const name = sanitizeFileName(userName ?? "");
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `backup.fin.${name}.${day}-${month}-${year}_${hours}-${minutes}.json`;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
