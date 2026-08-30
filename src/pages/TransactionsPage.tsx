import { useMemo, useState } from "react";
import type { Transaction, TransactionFilters } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { useDebouncedValue } from "../hooks/useDebounce";
import { CATEGORIES, getCategory, KIND_META, paymentLabel, categoryPath } from "../data/categories";
import { downloadCsv } from "../utils/csv";
import { formatDayMonth, formatDateBR, monthKeyOf, monthLongLabel } from "../utils/date";
import {
  EMPTY_FILTERS,
  filterTransactions,
  isActive,
  resultSign,
  sortTransactionsDesc,
  sumKind,
  EXPENSE_KINDS,
  INCOME_KINDS,
} from "../utils/finance";
import { formatBRL, formatSignedBRL } from "../utils/format";
import { Badge, Card, PageHeader, type BadgeTone } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/Modal";
import { FiltersBar } from "../components/transactions/FiltersBar";
import { CsvImportModal } from "../components/csv/CsvImportModal";
import {
  IconChevronDown,
  IconDownload,
  IconPencil,
  IconPlus,
  IconSwap,
  IconTrash,
  IconArrowUpRight,
} from "../components/ui/icons";

const STATUS_BADGE: Record<Transaction["status"], { label: string; tone: BadgeTone }> = {
  criada: { label: "criada", tone: "neutral" },
  alterada: { label: "alterada", tone: "gold" },
  corrigida: { label: "corrigida", tone: "gold" },
  estornada: { label: "estornada", tone: "down" },
  cancelada: { label: "cancelada", tone: "down" },
};

export function TransactionsPage() {
  const {
    status,
    transactions,
    accounts,
    cancelTransaction,
    reverseTransaction,
    reactivateTransaction,
    openTransactionModal,
    refresh,
  } = useFinance();
  const { push } = useToast();
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [pendingCancel, setPendingCancel] = useState<Transaction | null>(null);
  const [pendingReverse, setPendingReverse] = useState<Transaction | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

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

  const accountNames = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.institution])),
    [accounts],
  );

  const totals = useMemo(() => {
    const ativas = filtered.filter(isActive);
    const receitas = sumKind(ativas, INCOME_KINDS);
    const despesas = sumKind(ativas, EXPENSE_KINDS);
    const aportes = sumKind(ativas, ["aporte"]);
    return { receitas, despesas, aportes, resultado: receitas - despesas };
  }, [filtered]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.kind !== "todas" ||
    filters.categoryId !== "todas" ||
    filters.accountId !== "todas" ||
    filters.period !== "tudo" ||
    filters.includeInactive;

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  return (
    <div>
      <PageHeader title="Movimentações" subtitle={`${transactions.length} lançamentos · histórico imutável`}>
        <Button
          variant="secondary"
          size="sm"
          icon={<IconDownload size={15} />}
          onClick={() => setImportOpen(true)}
        >
          Importar CSV
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<IconDownload size={15} />}
          onClick={() => {
            if (filtered.length === 0) {
              push("info", "Nada para exportar", "Nenhuma movimentação corresponde aos filtros.");
              return;
            }
            downloadCsv(
              "movimentacoes.csv",
              ["Data", "Tipo", "Descrição", "Categoria", "Conta", "Pagamento", "Status", "Valor"],
              filtered.map((tx) => [
                tx.date,
                KIND_META[tx.kind].label,
                tx.description,
                categoryPath(tx.subcategoryId ?? tx.categoryId),
                accountNames.get(tx.accountId) ?? tx.accountId,
                paymentLabel(tx.paymentMethod),
                tx.status,
                tx.amount.toFixed(2).replace(".", ","),
              ]),
            );
            push("success", "CSV exportado", `${filtered.length} movimentações no arquivo.`);
          }}
        >
          Exportar
        </Button>
        <Button size="sm" icon={<IconPlus size={15} />} onClick={() => openTransactionModal()}>
          Adicionar
        </Button>
      </PageHeader>

      <div className="anim-rise space-y-4" style={{ animationDelay: "60ms" }}>
        <FiltersBar
          filters={filters}
          categories={CATEGORIES}
          accountNames={accountNames}
          hasActiveFilters={hasActiveFilters}
          onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />

        <Card className="grid grid-cols-2 divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {[
            { label: "Receitas no filtro", value: formatBRL(totals.receitas), cls: "text-up" },
            { label: "Despesas no filtro", value: formatBRL(totals.despesas), cls: "text-down" },
            { label: "Aportes", value: formatBRL(totals.aportes), cls: "text-inv" },
            {
              label: "Resultado",
              value: formatSignedBRL(totals.resultado),
              cls: totals.resultado >= 0 ? "text-up" : "text-down",
            },
          ].map((item) => (
            <div key={item.label} className="px-4 py-3.5 sm:px-5">
              <p className="text-[11px] font-semibold text-mut sm:text-xs">{item.label}</p>
              <p className={`tnum mt-1 font-display text-base font-bold sm:text-lg ${item.cls}`}>{item.value}</p>
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
              description="Registre receitas, despesas, transferências e aportes para acompanhar seu dinheiro."
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
              const monthNet = items.filter(isActive).reduce((acc, tx) => acc + tx.amount * resultSign(tx), 0);
              return (
                <section key={monthKey} aria-label={monthLongLabel(monthKey)}>
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <h2 className="font-display text-sm font-bold uppercase tracking-wide text-mut">
                      {monthLongLabel(monthKey)}
                    </h2>
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{items.length} itens</Badge>
                      <span className={`tnum text-[13px] font-bold ${monthNet >= 0 ? "text-up" : "text-down"}`}>
                        {formatSignedBRL(monthNet)}
                      </span>
                    </div>
                  </div>
                  <Card className="divide-y divide-line overflow-hidden">
                    {items.map((tx) => {
                      const meta = KIND_META[tx.kind];
                      const inactive = !isActive(tx);
                      const sign = resultSign(tx);
                      const accountName = accountNames.get(tx.accountId) ?? "";
                      return (
                        <div key={tx.id} className={`group ${inactive ? "opacity-55" : ""}`}>
                          <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-card2/60 sm:px-5">
                            <span className="hidden w-14 shrink-0 text-center text-xs font-semibold text-mut sm:block">
                              {formatDayMonth(tx.date)}
                            </span>
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor: `color-mix(in oklab, ${meta.color} 12%, transparent)`,
                                color: meta.color,
                              }}
                            >
                              {sign > 0 ? <IconArrowUpRight size={15} /> : sign < 0 ? <IconChevronDown size={15} /> : <IconSwap size={15} />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="truncate text-sm font-semibold text-ink">{tx.description}</p>
                                {tx.status !== "criada" ? (
                                  <Badge tone={STATUS_BADGE[tx.status].tone}>{STATUS_BADGE[tx.status].label}</Badge>
                                ) : null}
                                {tx.installmentGroup ? (
                                  <Badge tone="inv">
                                    {tx.installmentNumber}/{tx.installmentTotal}x
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-mut">
                                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                                {categoryPath(tx.subcategoryId ?? tx.categoryId)}
                                <span aria-hidden="true">·</span>
                                {accountName}
                                <span aria-hidden="true">·</span>
                                {paymentLabel(tx.paymentMethod)}
                                <span className="sm:hidden" aria-hidden="true">·</span>
                                <span className="sm:hidden">{formatDayMonth(tx.date)}</span>
                                {tx.audit.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedAudit(expandedAudit === tx.id ? null : tx.id)}
                                    className="font-semibold text-inv hover:underline"
                                  >
                                    {tx.audit.length - 1} alteração(ões)
                                  </button>
                                ) : null}
                              </p>
                            </div>
                            <span
                              className={`tnum shrink-0 text-sm font-bold ${
                                inactive ? "text-mut line-through" : sign > 0 ? "text-up" : sign < 0 ? "text-down" : "text-mut"
                              }`}
                            >
                              {formatBRL(tx.amount)}
                            </span>
                            <div className="flex shrink-0 items-center gap-0.5 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                              {inactive ? (
                                <IconButton
                                  label={`Reativar ${tx.description}`}
                                  size="sm"
                                  onClick={() => {
                                    reactivateTransaction(tx.id);
                                    push("info", "Lançamento reativado", tx.description);
                                  }}
                                >
                                  <IconArrowUpRight size={15} />
                                </IconButton>
                              ) : (
                                <>
                                  <IconButton label={`Editar ${tx.description}`} size="sm" onClick={() => openTransactionModal({ editing: tx })}>
                                    <IconPencil size={15} />
                                  </IconButton>
                                  <IconButton label={`Estornar ${tx.description}`} size="sm" onClick={() => setPendingReverse(tx)}>
                                    <IconSwap size={15} />
                                  </IconButton>
                                  <IconButton label={`Cancelar ${tx.description}`} size="sm" tone="danger" onClick={() => setPendingCancel(tx)}>
                                    <IconTrash size={15} />
                                  </IconButton>
                                </>
                              )}
                            </div>
                          </div>
                          {expandedAudit === tx.id ? (
                            <div className="anim-fadein border-t border-dashed border-line bg-card2/50 px-5 py-3">
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mut">
                                Histórico imutável
                              </p>
                              <ol className="space-y-1.5">
                                {tx.audit.map((entry, index) => (
                                  <li key={index} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                                    <Badge tone={entry.action === "criada" ? "up" : entry.action === "cancelada" || entry.action === "estornada" ? "down" : "gold"}>
                                      {entry.action}
                                    </Badge>
                                    <span className="tnum text-mut">{formatDateBR(entry.at.slice(0, 10))}</span>
                                    {entry.reason ? <span className="text-mut">motivo: {entry.reason}</span> : null}
                                    {entry.changes
                                      ? entry.changes.map((change) => (
                                          <span key={change.field} className="text-mut">
                                            {change.field}: <s>{change.from}</s> → <strong className="text-ink">{change.to}</strong>
                                          </span>
                                        ))
                                      : null}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          ) : null}
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
        open={pendingCancel !== null}
        title="Cancelar lançamento"
        confirmLabel="Cancelar lançamento"
        message={
          <p>
            Cancelar <strong className="text-ink">“{pendingCancel?.description}”</strong> de{" "}
            <strong className="text-ink">{pendingCancel ? formatBRL(pendingCancel.amount) : ""}</strong>?
            O registro permanece no histórico (exclusão lógica) e deixa de contar nos cálculos.
          </p>
        }
        onCancel={() => setPendingCancel(null)}
        onConfirm={() => {
          if (pendingCancel) {
            cancelTransaction(pendingCancel.id, "Cancelado pelo usuário");
            push("success", "Lançamento cancelado", `${pendingCancel.description} segue no histórico.`);
          }
          setPendingCancel(null);
        }}
      />

      <ConfirmDialog
        open={pendingReverse !== null}
        title="Estornar lançamento"
        confirmLabel="Estornar"
        message={
          <p>
            Estornar <strong className="text-ink">“{pendingReverse?.description}”</strong>? Será criado
            um estorno compensatório hoje e o original será marcado como estornado — nada é apagado.
          </p>
        }
        onCancel={() => setPendingReverse(null)}
        onConfirm={() => {
          if (pendingReverse) {
            reverseTransaction(pendingReverse.id, "Estorno solicitado pelo usuário");
            push("success", "Estorno criado", `Compensação de ${formatBRL(pendingReverse.amount)} registrada.`);
          }
          setPendingReverse(null);
        }}
      />

      <CsvImportModal
        open={importOpen}
        accounts={accounts}
        cards={cards}
        defaultAccountId={accounts[0]?.id ?? ""}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
