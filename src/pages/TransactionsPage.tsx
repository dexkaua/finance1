import { useMemo, useState } from "react";
import type { Transaction, TransactionFilters } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { useDebouncedValue } from "../hooks/useDebounce";
import { CATEGORIES, getCategory, paymentLabel, TRANSACTION_TYPE_LABEL } from "../data/categories";
import { formatDayMonth, monthKeyOf, monthLongLabel } from "../utils/date";
import {
  EMPTY_FILTERS,
  filterTransactions,
  sortTransactionsDesc,
} from "../utils/finance";
import { formatBRL, formatSignedBRL } from "../utils/format";
import { Badge, Card, PageHeader } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/Modal";
import { FiltersBar } from "../components/transactions/FiltersBar";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCoins,
  IconDownload,
  IconPencil,
  IconPlus,
  IconSwap,
  IconTrash,
} from "../components/ui/icons";

function exportCSV(rows: Transaction[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ["Data", "Tipo", "Descrição", "Categoria", "Pagamento", "Valor (R$)"].join(";");
  const lines = rows.map((tx) =>
    [
      tx.date,
      TRANSACTION_TYPE_LABEL[tx.type],
      escape(tx.description),
      escape(getCategory(tx.categoryId)?.label ?? tx.categoryId),
      escape(paymentLabel(tx.paymentMethod)),
      tx.amount.toFixed(2).replace(".", ","),
    ].join(";"),
  );
  const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "movimentacoes.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function TransactionsPage() {
  const {
    status,
    transactions,
    deleteTransaction,
    openTransactionModal,
    refresh,
  } = useFinance();
  const { push } = useToast();
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const debouncedSearch = useDebouncedValue(filters.search, 250);

  const filtered = useMemo(() => {
    const sorted = sortTransactionsDesc(transactions);
    return filterTransactions(sorted, { ...filters, search: debouncedSearch });
  }, [transactions, filters, debouncedSearch]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const key = monthKeyOf(tx.date);
      const list = map.get(key);
      if (list) list.push(tx);
      else map.set(key, [tx]);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const totals = useMemo(() => {
    let receitas = 0;
    let despesas = 0;
    for (const tx of filtered) {
      if (tx.type === "receita") receitas += tx.amount;
      else if (tx.type === "despesa") despesas += tx.amount;
    }
    return { receitas, despesas, resultado: receitas - despesas };
  }, [filtered]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.type !== "todas" ||
    filters.categoryId !== "todas" ||
    filters.period !== "tudo";

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  return (
    <div>
      <PageHeader
        title="Movimentações"
        subtitle={`${transactions.length} lançamentos registrados`}
      >
        <Button
          variant="secondary"
          size="sm"
          icon={<IconDownload size={15} />}
          onClick={() => {
            if (filtered.length === 0) {
              push("info", "Nada para exportar", "Nenhuma movimentação corresponde aos filtros.");
              return;
            }
            exportCSV(filtered);
            push("success", "CSV exportado", `${filtered.length} movimentações no arquivo.`);
          }}
        >
          Exportar CSV
        </Button>
        <Button size="sm" icon={<IconPlus size={15} />} onClick={() => openTransactionModal()}>
          Adicionar
        </Button>
      </PageHeader>

      <div className="anim-rise space-y-4" style={{ animationDelay: "60ms" }}>
        <FiltersBar
          filters={filters}
          categories={CATEGORIES}
          hasActiveFilters={hasActiveFilters}
          onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />

        {/* Resumo do filtro atual */}
        <Card className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { label: "Receitas no filtro", value: formatBRL(totals.receitas), cls: "text-up" },
            { label: "Despesas no filtro", value: formatBRL(totals.despesas), cls: "text-down" },
            {
              label: "Resultado",
              value: formatSignedBRL(totals.resultado),
              cls: totals.resultado >= 0 ? "text-up" : "text-down",
            },
          ].map((item) => (
            <div key={item.label} className="px-5 py-4">
              <p className="text-xs font-semibold text-mut">{item.label}</p>
              <p className={`tnum mt-1 font-display text-lg font-bold ${item.cls}`}>{item.value}</p>
            </div>
          ))}
        </Card>

        {status === "loading" ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-56" />
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <Card>
            <EmptyState
              icon={<IconSwap size={22} />}
              title="Nenhuma movimentação por aqui"
              description="Registre receitas, despesas e aportes para acompanhar seu dinheiro."
              action={
                <Button icon={<IconPlus size={16} />} onClick={() => openTransactionModal()}>
                  Adicionar movimentação
                </Button>
              }
            />
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={<IconSwap size={22} />}
              title="Nada encontrado"
              description="Nenhuma movimentação corresponde à busca e aos filtros atuais."
              action={
                <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Limpar filtros
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(([monthKey, items]) => {
              const monthNet = items.reduce(
                (acc, tx) =>
                  tx.type === "receita" ? acc + tx.amount : tx.type === "despesa" ? acc - tx.amount : acc,
                0,
              );
              return (
                <section key={monthKey} aria-label={monthLongLabel(monthKey)}>
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <h2 className="font-display text-sm font-bold uppercase tracking-wide text-mut">
                      {monthLongLabel(monthKey)}
                    </h2>
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{items.length} itens</Badge>
                      <span
                        className={`tnum text-[13px] font-bold ${
                          monthNet >= 0 ? "text-up" : "text-down"
                        }`}
                      >
                        {formatSignedBRL(monthNet)}
                      </span>
                    </div>
                  </div>
                  <Card className="divide-y divide-line overflow-hidden">
                    {items.map((tx) => {
                      const category = getCategory(tx.categoryId);
                      const isReceita = tx.type === "receita";
                      const isAporte = tx.type === "investimento";
                      return (
                        <div
                          key={tx.id}
                          className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-card2/60 sm:px-5"
                        >
                          <span className="hidden w-14 shrink-0 text-center text-xs font-semibold text-mut sm:block">
                            {formatDayMonth(tx.date)}
                          </span>
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              isReceita
                                ? "bg-up/10 text-up"
                                : isAporte
                                  ? "bg-inv/10 text-inv"
                                  : "bg-down/10 text-down"
                            }`}
                          >
                            {isReceita ? (
                              <IconArrowUpRight size={16} />
                            ) : isAporte ? (
                              <IconCoins size={16} />
                            ) : (
                              <IconArrowDownRight size={16} />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">
                              {tx.description}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-mut">
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: category?.color ?? "#8b949e" }}
                              />
                              {category?.label ?? tx.categoryId}
                              <span aria-hidden="true">·</span>
                              {paymentLabel(tx.paymentMethod)}
                              <span className="sm:hidden" aria-hidden="true">·</span>
                              <span className="sm:hidden">{formatDayMonth(tx.date)}</span>
                            </p>
                          </div>
                          <span
                            className={`tnum shrink-0 text-sm font-bold ${
                              isReceita ? "text-up" : isAporte ? "text-inv" : "text-down"
                            }`}
                          >
                            {isAporte ? formatBRL(tx.amount) : formatSignedBRL(isReceita ? tx.amount : -tx.amount)}
                          </span>
                          <div className="flex shrink-0 items-center gap-0.5 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                            <IconButton
                              label={`Editar ${tx.description}`}
                              size="sm"
                              onClick={() => openTransactionModal(tx)}
                            >
                              <IconPencil size={15} />
                            </IconButton>
                            <IconButton
                              label={`Excluir ${tx.description}`}
                              size="sm"
                              tone="danger"
                              onClick={() => setPendingDelete(tx)}
                            >
                              <IconTrash size={15} />
                            </IconButton>
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir movimentação"
        message={
          <p>
            Tem certeza que deseja excluir{" "}
            <strong className="text-ink">“{pendingDelete?.description}”</strong> de{" "}
            <strong className="text-ink">{pendingDelete ? formatBRL(pendingDelete.amount) : ""}</strong>?
            Essa ação não pode ser desfeita.
          </p>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteTransaction(pendingDelete.id);
            push("success", "Movimentação excluída", pendingDelete.description);
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
