/** Geração de identificadores únicos. */
export function uid(prefix = "id"): string {
  let random: string;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    random = crypto.randomUUID().slice(0, 8);
  } else {
    random = Math.random().toString(36).slice(2, 10);
  }
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}
