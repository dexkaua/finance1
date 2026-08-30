/** Formatação de moeda, números e entradas monetárias (pt-BR). */

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const brlCompactFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

export function formatBRL(value: number): string {
  return brlFormatter.format(value);
}

export function formatBRLCompact(value: number): string {
  return brlCompactFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Sinal explícito: "+ R$ 120,00" ou "− R$ 80,00". */
export function formatSignedBRL(value: number): string {
  const abs = brlFormatter.format(Math.abs(value));
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

/**
 * Converte texto digitado ("1.234,56", "1234.56", "R$ 90") em número.
 * Retorna null quando não é um valor numérico válido.
 */
export function parseCurrencyInput(raw: string): number | null {
  const cleaned = raw.replace(/[R$\s]/g, "");
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
