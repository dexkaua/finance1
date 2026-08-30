import { useEffect, useMemo, useRef, useState } from "react";
import type { Page } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import { KIND_META, categoryPath } from "../../data/categories";
import { searchAll, accountBalance } from "../../utils/finance";
import { formatDateBR } from "../../utils/date";
import { formatBRL, formatSignedBRL } from "../../utils/format";

function navigateTo(page: Page) {
  window.location.hash = `/${page}`;
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { appData, openTransactionModal } = useFinance();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !open) {
        const target = event.target as HTMLElement;
        if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
        event.preventDefault();
        const button = document.querySelector<HTMLButtonElement>("[data-search-trigger]");
        button?.click();
      }
      if (event.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const results = useMemo(
    () => (query.trim().length >= 2 ? searchAll(query, appData) : null),
    [query, appData],
  );

  if (!open) return null;

  const total = results
    ? results.transactions.length + results.accounts.length + results.cards.length +
      results.investments.length + results.debts.length + results.goals.length + results.assets.length
    : 0;

  const Section = ({ title, count, children }: { title: string; count: number; children: React.ReactNode }) =>
    count > 0 ? (
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-mut">
          {title} <span className="font-semibold text-mut/70">({count})</span>
        </p>
        <div className="space-y-1">{children}</div>
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-[65] flex items-start justify-center p-4 pt-[12vh]">
      <div className="anim-fadein absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-card shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-mut" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-3.8-3.8" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar transações, contas, cartões, investimentos, dívidas, metas…"
            aria-label="Busca universal"
            className="h-13 w-full bg-transparent py-4 text-[15px] text-ink placeholder:text-mut/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-card2 px-1.5 py-0.5 text-[10px] font-bold text-mut"
          >
            ESC
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-4">
          {!results ? (
            <p className="py-8 text-center text-sm text-mut">
              Digite pelo menos 2 caracteres. Ex.: “Uber”, “Tesouro”, “R$ 600”, “Netflix”.
            </p>
          ) : total === 0 ? (
            <p className="py-8 text-center text-sm text-mut">
              Nada encontrado para “{query}” nos seus dados.
            </p>
          ) : (
            <div className="space-y-4">
              <Section title="Movimentações" count={results.transactions.length}>
                {results.transactions.map((tx) => (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => {
                      openTransactionModal({ editing: tx });
                      onClose();
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-line hover:bg-card2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{tx.description}</span>
                      <span className="text-xs text-mut">
                        {KIND_META[tx.kind].label} · {categoryPath(tx.categoryId)} · {formatDateBR(tx.date)}
                      </span>
                    </span>
                    <span className="tnum shrink-0 text-sm font-bold text-ink">{formatSignedBRL(tx.kind === "despesa" ? -tx.amount : tx.amount)}</span>
                  </button>
                ))}
              </Section>

              <Section title="Investimentos" count={results.investments.length}>
                {results.investments.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => { navigateTo("investimentos"); onClose(); }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-line hover:bg-card2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{inv.name}</span>
                      <span className="text-xs text-mut">{inv.institution}{inv.broker ? ` · ${inv.broker}` : ""}</span>
                    </span>
                    <span className="tnum shrink-0 text-sm font-bold text-ink">{formatBRL(inv.currentValue)}</span>
                  </button>
                ))}
              </Section>

              <Section title="Contas" count={results.accounts.length}>
                {results.accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => { navigateTo("contas"); onClose(); }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-line hover:bg-card2"
                  >
                    <span className="text-sm font-semibold text-ink">{account.institution}</span>
                    <span className="tnum text-sm font-bold text-ink">
                      {formatBRL(accountBalance(account, appData.transactions))}
                    </span>
                  </button>
                ))}
              </Section>

              <Section title="Cartões" count={results.cards.length}>
                {results.cards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => { navigateTo("cartoes"); onClose(); }}
                    className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-line hover:bg-card2"
                  >
                    <span className="text-sm font-semibold text-ink">{card.name}</span>
                    <span className="text-xs text-mut">{card.bank}</span>
                  </button>
                ))}
              </Section>

              <Section title="Dívidas" count={results.debts.length}>
                {results.debts.map((debt) => (
                  <button
                    key={debt.id}
                    type="button"
                    onClick={() => { navigateTo("dividas"); onClose(); }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-line hover:bg-card2"
                  >
                    <span className="text-sm font-semibold text-ink">{debt.creditor}</span>
                    <span className="tnum text-sm font-bold text-down">{formatBRL(debt.balance)}</span>
                  </button>
                ))}
              </Section>

              <Section title="Metas" count={results.goals.length}>
                {results.goals.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => { navigateTo("metas"); onClose(); }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-line hover:bg-card2"
                  >
                    <span className="text-sm font-semibold text-ink">{goal.name}</span>
                    <span className="tnum text-xs font-bold text-mut">
                      {((goal.currentAmount / goal.targetAmount) * 100).toFixed(0)}%
                    </span>
                  </button>
                ))}
              </Section>

              <Section title="Bens" count={results.assets.length}>
                {results.assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => { navigateTo("patrimonio"); onClose(); }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-line hover:bg-card2"
                  >
                    <span className="text-sm font-semibold text-ink">{asset.name}</span>
                    <span className="tnum text-sm font-bold text-ink">{formatBRL(asset.value)}</span>
                  </button>
                ))}
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
