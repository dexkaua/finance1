/** Parser e gerador de CSV (suporta ; ou ,, aspas e quebras). */

export interface ParsedCsv {
  delimiter: string;
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const cleaned = text.replace(/^\uFEFF/, "");
  const firstLine = cleaned.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes(";") ? ";" : ",";

  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (inQuotes) {
      if (char === '"') {
        if (cleaned[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      current.push(field.trim());
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && cleaned[i + 1] === "\n") i++;
      current.push(field.trim());
      field = "";
      if (current.some((c) => c !== "")) rows.push(current);
      current = [];
    } else {
      field += char;
    }
  }
  current.push(field.trim());
  if (current.some((c) => c !== "")) rows.push(current);

  const headers = rows.shift() ?? [];
  return { delimiter, headers, rows };
}

export function toCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const escape = (value: string | number) => {
    const str = String(value);
    return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return "\uFEFF" + [headers.map(escape).join(";"), ...rows.map((r) => r.map(escape).join(";"))].join("\n");
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const blob = new Blob([toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Normaliza valor monetário vindo de CSV ("1.234,56", "-R$ 90,00", "1234.56"). */
export function parseCsvAmount(raw: string): number | null {
  let cleaned = raw.replace(/[R$US$\s€]/g, "");
  let negative = false;
  if (cleaned.startsWith("-") || cleaned.startsWith("(")) {
    negative = true;
    cleaned = cleaned.replace(/[-()]/g, "");
  }
  if (cleaned === "") return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

/** Normaliza data vinda de CSV (dd/mm/aaaa, aaaa-mm-dd). */
export function parseCsvDate(raw: string): string | null {
  const trimmed = raw.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  return null;
}
