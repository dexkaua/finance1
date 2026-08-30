/** Utilitários de data trabalhando com strings ISO (YYYY-MM-DD) e chaves de mês (YYYY-MM). */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7);
}

export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Últimos `count` meses (do mais antigo ao atual, inclusive). */
export function lastMonthKeys(count: number): string[] {
  const current = currentMonthKey();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) keys.push(shiftMonthKey(current, -i));
  return keys;
}

function monthDate(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

/** "jan/26" */
export function monthShortLabel(key: string): string {
  const label = monthDate(key)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  const year = key.slice(2, 4);
  return `${label}/${year}`;
}

/** "Janeiro de 2026" */
export function monthLongLabel(key: string): string {
  const month = monthDate(key).toLocaleDateString("pt-BR", { month: "long" });
  const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capitalized} de ${key.slice(0, 4)}`;
}

function parseISO(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "05 fev 2026" */
export function formatDateBR(isoDate: string): string {
  return parseISO(isoDate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "05 fev" */
export function formatDayMonth(isoDate: string): string {
  return parseISO(isoDate)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
}

export function daysUntil(isoDate: string): number {
  const ms = parseISO(isoDate).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Meses cheios restantes até a data (mínimo 1 para cálculo de aporte mensal). */
export function monthsUntil(isoDate: string): number {
  const target = parseISO(isoDate);
  const now = new Date();
  const diff =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  return Math.max(1, diff);
}

/** Saudação conforme horário local. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
