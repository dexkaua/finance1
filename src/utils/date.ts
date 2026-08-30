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

export function parseISO(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
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
  return `${label}/${key.slice(2, 4)}`;
}

/** "Janeiro de 2026" */
export function monthLongLabel(key: string): string {
  const month = monthDate(key).toLocaleDateString("pt-BR", { month: "long" });
  const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capitalized} de ${key.slice(0, 4)}`;
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
  const ms = parseISO(isoDate).getTime() - parseISO(todayISO()).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / (1000 * 60 * 60 * 24));
}

export function monthsUntil(isoDate: string): number {
  const target = parseISO(isoDate);
  const now = new Date();
  return Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth());
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = parseISO(isoDate);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addMonthsISO(isoDate: string, months: number): string {
  const d = parseISO(isoDate);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

export function lastDayOfMonthISO(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return toISODate(new Date(y, m, 0));
}

export function yearOf(isoDate: string): string {
  return isoDate.slice(0, 4);
}

/** Data do dia `day` dentro de um mês (ajusta para o último dia quando necessário). */
export function dayInMonth(monthKey: string, day: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return toISODate(new Date(y, m - 1, Math.min(day, last)));
}

/**
 * Vencimento da fatura de um mês: se o dia de vencimento é >= dia de fechamento,
 * vence no próprio mês; senão, no mês seguinte (ciclo de cartão real).
 */
export function invoiceDueDate(monthKey: string, closingDay: number, dueDay: number): string {
  const dueMonth = dueDay >= closingDay ? monthKey : shiftMonthKey(monthKey, 1);
  return dayInMonth(dueMonth, dueDay);
}

export function invoiceClosingDate(monthKey: string, closingDay: number): string {
  return dayInMonth(monthKey, closingDay);
}
