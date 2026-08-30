import { useMemo, useState } from "react";
import type { Investment } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { INVESTMENT_TYPES, investmentTypeMeta, YIELD_MODES } from "../data/categories";
import { downloadCsv } from "../utils/csv";
import { formatDateBR } from "../utils/date";
import {
  dividendsByInvestment,
  findInvestmentGroups,
  investmentSummary,
  portfolioReturns,
  totalDividends,
} from "../utils/finance";
import { formatBRL, formatNumber, formatPercent, formatSignedBRL } from "../utils/format";
import { Badge, Card, PageHeader, ProgressBar, SectionHeader } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { InvestmentModal } from "../components/investments/InvestmentModal";
import { DonutChart } from "../components/charts/DonutChart";
import { IconCoins, IconDownload, IconPencil, IconPlus, IconTrash, IconTrendUp } from "../components/ui/icons";

export function InvestmentsPage() {
  const {
    status,
    investments,
    transactions,
    settings,
    removeInvestment,
    groupInvestments,
    ignoreGroup,
    refresh,
  } = useFinance();
  const { push } = useToast();
  const [modal, setModal] = useState<{ open: boolean; editing: Investment | null }>({ open: false, editing: null });
  const [pendingDelete, setPendingDelete] = useState<Investment | null>(null);
  const [groupConfirm, setGroupConfirm] = useState<Investment[] | null>(null);
  const [tab, setTab] = useState<"posicoes" | "retorno" | "dividendos">("posicoes");

  const summary = useMemo(() => investmentSummary(investments), [investments]);
  const returns = useMemo(
    () => portfolioReturns(investments, transactions, settings.benchmarks.ipca),
    [investments, transactions, settings.benchmarks.ipca],
  );
  const groups = useMemo(
    () => findInvestmentGroups(investments, settings.ignoredGroups),
    [investments, settings.ignoredGroups],
  );

  const allocation = useMemo(() => {
    const total = summary.current;
    return INVESTMENT_TYPES.map((type) => {
      const value = investments
        .filter((inv) => inv.type === type.value)
        .reduce((acc, inv) => acc + inv.currentValue, 0);
      return {
        key: type.value,
        label: type.label,
        value,
        color: type.color,
        pct: total > 0 ? (value / total) * 100 : 0,
      };
    }).filter((slice) => slice.value > 0);
  }, [investments, summary.current]);

  const dividends = useMemo(
    () =>
      investments
        .map((inv) => ({ inv, total: dividendsByInvestment(transactions, inv.id) }))
        .filter((row) => row.total > 0)
        .sort((a, b) => b.total - a.total),
    [investments, transactions],
  );
  const dividendsTotal = useMemo(() => totalDividends(transactions), [transactions]);

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  return (
    <div>
      <PageHeader title="Investimentos" subtitle="Posições, rentabilidade e dividendos — aportes nunca viram lucro">
        <Button
          variant="secondary"
          size="sm"
          icon={<IconDownload size={15} />}
          onClick={() => {
            downloadCsv(
              "investimentos.csv",
              ["Nome", "Tipo", "Instituição", "Corretora", "Qtd", "Preço médio", "Preço atual", "Investido", "Atual", "Lucro", "Início", "Vencimento"],
              investments.map((inv) => [
                inv.name,
                investmentTypeMeta(inv.type).label,
                inv.institution,
                inv.broker ?? "",
                inv.quantity ?? "",
                inv.avgPrice ?? "",
                inv.currentPrice ?? "",
                inv.investedAmount.toFixed(2).replace(".", ","),
                inv.currentValue.toFixed(2).replace(".", ","),
                (inv.currentValue - inv.investedAmount).toFixed(2).replace(".", ","),
                inv.startDate,
                inv.maturityDate ?? "",
              ]),
            );
            push("success", "CSV exportado", `${investments.length} posições no arquivo.`);
          }}
        >
          Exportar
        </Button>
        <Button size="sm" icon={<IconPlus size={15} />} onClick={() => setModal({ open: true, editing: null })}>
          Novo investimento
        </Button>
      </PageHeader>

      {groups.length > 0 ? (
        <div className="anim-rise mb-4 rounded-xl border border-gold/40 bg-gold/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ink">
                Encontramos investimentos iguais que podem ser agrupados.
              </p>
              <p className="mt-0.5 text-[13px] text-mut">
                {groups[0].items.length} registros de “{groups[0].items[0].name}” em{" "}
                {groups[0].items[0].broker ?? groups[0].items[0].institution}. O agrupamento soma os
                valores e preserva o histórico original — nada é apagado.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setGroupConfirm(groups[0].items)}>
                Agrupar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  ignoreGroup(groups[0].key);
                  push("info", "Grupo ignorado", "Você pode agrupar depois, quando quiser.");
                }}
              >
                Ignorar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Total investido", value: formatBRL(summary.invested), cls: "text-ink" },
              { label: "Valor atual", value: formatBRL(summary.current), cls: "text-ink" },
              {
                label: "Lucro / prejuízo",
                value: formatSignedBRL(summary.profit),
                cls: summary.profit >= 0 ? "text-up" : "text-down",
                extra: <Badge tone={summary.profit >= 0 ? "up" : "down"}>{formatPercent(summary.profitPct)}</Badge>,
              },
              {
                label: "Dividendos recebidos",
                value: formatBRL(dividendsTotal),
                cls: "text-up",
              },
            ].map((tile, index) => (
              <Card key={tile.label} hover className="anim-rise p-4">
                <div style={{ animationDelay: `${index * 50}ms` }}>
                  <p className="text-xs font-semibold text-mut">{tile.label}</p>
                  <p className={`tnum mt-1.5 font-display text-lg font-bold sm:text-xl ${tile.cls}`}>{tile.value}</p>
                  {tile.extra ? <div className="mt-1.5">{tile.extra}</div> : null}
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-1 rounded-lg border border-line bg-card2 p-1 sm:w-fit">
            {(
              [
                ["posicoes", "Posições"],
                ["retorno", "Rentabilidade"],
                ["dividendos", "Dividendos"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-pressed={tab === key}
                className={[
                  "flex-1 rounded-md px-4 py-1.5 text-[13px] font-semibold transition-all sm:flex-none",
                  tab === key ? "border border-line bg-card text-ink shadow-sm" : "text-mut hover:text-ink",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "posicoes" ? (
            investments.length === 0 ? (
              <Card className="anim-rise">
                <EmptyState
                  icon={<IconTrendUp size={22} />}
                  title="Nenhum investimento cadastrado"
                  description="Cadastre Tesouro, CDB, ações, FIIs, ETFs, cripto e mais."
                  action={
                    <Button icon={<IconPlus size={16} />} onClick={() => setModal({ open: true, editing: null })}>
                      Cadastrar investimento
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
                <Card className="anim-rise overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-[13px]">
                      <thead className="bg-card2/70">
                        <tr className="text-[11px] uppercase tracking-wide text-mut">
                          <th className="px-4 py-3 font-semibold">Ativo</th>
                          <th className="px-3 py-3 font-semibold">Rentabilidade</th>
                          <th className="tnum px-3 py-3 text-right font-semibold">Investido</th>
                          <th className="tnum px-3 py-3 text-right font-semibold">Atual</th>
                          <th className="tnum px-3 py-3 text-right font-semibold">Lucro</th>
                          <th className="tnum px-3 py-3 text-right font-semibold">% carteira</th>
                          <th className="px-3 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {[...investments]
                          .sort((a, b) => b.currentValue - a.currentValue)
                          .map((inv) => {
                            const meta = investmentTypeMeta(inv.type);
                            const profit = inv.currentValue - inv.investedAmount;
                            const share = summary.current > 0 ? (inv.currentValue / summary.current) * 100 : 0;
                            const yieldLabel =
                              inv.yield.mode === "manual"
                                ? "—"
                                : inv.yield.mode === "cdi"
                                  ? `${formatNumber(inv.yield.rate)}% CDI`
                                  : inv.yield.mode === "selic"
                                    ? `${formatNumber(inv.yield.rate)}% Selic`
                                    : inv.yield.mode === "ipca"
                                      ? `IPCA + ${formatNumber(inv.yield.rate)}%`
                                      : `${formatNumber(inv.yield.rate)}% a.a.`;
                            return (
                              <tr key={inv.id} className="group transition-colors hover:bg-card2/60">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                                    <div className="min-w-0">
                                      <p className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
                                        {inv.name}
                                        {inv.mergedFrom && inv.mergedFrom.length > 0 ? (
                                          <Badge tone="gold">{inv.mergedFrom.length} unificados</Badge>
                                        ) : null}
                                      </p>
                                      <p className="text-[11px] text-mut">
                                        {meta.label} · {inv.broker ?? inv.institution}
                                        {inv.quantity !== null
                                          ? ` · ${formatNumber(inv.quantity)} ${inv.avgPrice !== null ? `@ ${formatNumber(inv.avgPrice)}` : ""}`
                                          : ""}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-mut">{yieldLabel}</td>
                                <td className="tnum px-3 py-3 text-right font-medium text-ink">{formatBRL(inv.investedAmount)}</td>
                                <td className="tnum px-3 py-3 text-right font-medium text-ink">{formatBRL(inv.currentValue)}</td>
                                <td className={`tnum px-3 py-3 text-right font-bold ${profit >= 0 ? "text-up" : "text-down"}`}>
                                  {formatSignedBRL(profit)}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <ProgressBar value={share / 100} color={meta.color} className="w-14" thickness="h-1.5" />
                                    <span className="tnum w-9 text-right text-xs font-semibold text-mut">
                                      {formatPercent(share, 0)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                    <IconButton label={`Editar ${inv.name}`} size="sm" onClick={() => setModal({ open: true, editing: inv })}>
                                      <IconPencil size={15} />
                                    </IconButton>
                                    <IconButton label={`Excluir ${inv.name}`} size="sm" tone="danger" onClick={() => setPendingDelete(inv)}>
                                      <IconTrash size={15} />
                                    </IconButton>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card className="anim-rise flex flex-col items-center p-5" hover>
                  <div style={{ animationDelay: "120ms" }} className="w-full">
                    <SectionHeader title="Alocação" subtitle="Por tipo de ativo" />
                    <div className="flex flex-col items-center">
                      <DonutChart slices={allocation} centerLabel="Total" centerValue={formatBRL(summary.current).replace(/\s/g, "")} />
                      <ul className="mt-3 w-full space-y-1.5">
                        {allocation.slice(0, 6).map((slice) => (
                          <li key={slice.key} className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-1.5 font-medium text-ink">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: slice.color }} />
                              {slice.label}
                            </span>
                            <span className="tnum text-mut">{formatPercent(slice.pct, 0)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            )
          ) : null}

          {tab === "retorno" ? (
            <Card className="anim-rise p-5">
              <SectionHeader
                title="Rentabilidade da carteira"
                subtitle="Aportes e resgates são tratados como fluxo, nunca como lucro"
              />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "Retorno acumulado", value: formatPercent(returns.profitPct), hint: "(atual ÷ investido − 1)" },
                  { label: "CAGR", value: returns.cagrPct !== null ? formatPercent(returns.cagrPct) : "—", hint: "crescimento anual composto" },
                  { label: "MWR anualizado", value: returns.mwrPct !== null ? formatPercent(returns.mwrPct) : "—", hint: "ponderado pelos aportes" },
                  { label: "Retorno real", value: returns.realPct !== null ? formatPercent(returns.realPct) : "—", hint: `descontando IPCA ${formatPercent(settings.benchmarks.ipca)}` },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-line bg-card2/60 p-4">
                    <p className="text-xs font-semibold text-mut">{item.label}</p>
                    <p className="tnum mt-1 font-display text-xl font-bold text-ink">{item.value}</p>
                    <p className="mt-1 text-[11px] text-mut">{item.hint}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-line bg-card2/60 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-mut">Comparação com benchmarks (índices configuráveis)</p>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {(
                    [
                      ["CDI", settings.benchmarks.cdi],
                      ["Selic", settings.benchmarks.selic],
                      ["IPCA", settings.benchmarks.ipca],
                      ["Ibovespa", settings.benchmarks.ibov],
                      ["S&P 500", settings.benchmarks.sp500],
                    ] as const
                  ).map(([name, rate]) => (
                    <li key={name} className="rounded-lg border border-line bg-card px-3 py-2 text-center">
                      <p className="text-[11px] font-semibold text-mut">{name}</p>
                      <p className="tnum font-display text-sm font-bold text-ink">{formatPercent(rate)} a.a.</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-mut">
                  Taxas anuais estimadas — ajuste em Configurações. TWR aproximado: sem histórico de
                  cotas mensais, usamos CAGR/MWR (padrão do mercado para carteiras pessoais).
                </p>
              </div>
            </Card>
          ) : null}

          {tab === "dividendos" ? (
            <Card className="anim-rise p-5">
              <SectionHeader
                title="Dividendos e rendimentos"
                subtitle={`${formatBRL(dividendsTotal)} recebidos no histórico`}
              />
              {dividends.length === 0 ? (
                <EmptyState
                  compact
                  icon={<IconCoins size={20} />}
                  title="Nenhum dividendo registrado"
                  description="Lance recebimentos como movimentação do tipo “Dividendo”, vinculando o ativo."
                />
              ) : (
                <ul className="space-y-3">
                  {dividends.map(({ inv, total }) => {
                    const yieldPct = inv.currentValue > 0 ? (total / inv.currentValue) * 100 : 0;
                    return (
                      <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card2/50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">{inv.name}</p>
                          <p className="text-[11px] text-mut">{investmentTypeMeta(inv.type).label} · yield histórico {formatPercent(yieldPct)}</p>
                        </div>
                        <span className="tnum font-display text-base font-bold text-up">{formatBRL(total)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          ) : null}

          <p className="text-[11px] text-mut">
            Exemplos de renda fixa já cadastrados: CDB 110% do CDI, LCI 92% do CDI, Tesouro IPCA+ 6,1% —
            cada um respeitando o modelo de rentabilidade configurado ({YIELD_MODES.length} modelos disponíveis).
          </p>
        </div>
      )}

      <InvestmentModal open={modal.open} editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />

      {/* Confirmação de agrupamento */}
      <Modal
        open={groupConfirm !== null}
        onClose={() => setGroupConfirm(null)}
        title="Unificar investimentos"
        subtitle="Operação contábil: soma os valores e guarda os registros originais para rastreabilidade."
        footer={
          <>
            <Button variant="secondary" onClick={() => setGroupConfirm(null)}>
              Fazer isso posteriormente
            </Button>
            <Button
              onClick={() => {
                if (groupConfirm) {
                  groupInvestments(groupConfirm);
                  setGroupConfirm(null);
                }
              }}
            >
              Agrupar
            </Button>
          </>
        }
      >
        {groupConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-mut">
              {groupConfirm.length} registros de <strong className="text-ink">“{groupConfirm[0].name}”</strong> em{" "}
              {groupConfirm[0].broker ?? groupConfirm[0].institution}:
            </p>
            <ul className="space-y-2">
              {groupConfirm.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-card2/50 px-3 py-2 text-[13px]">
                  <span className="text-mut">
                    desde {formatDateBR(inv.startDate)}
                    {inv.quantity !== null ? ` · ${formatNumber(inv.quantity)} un.` : ""}
                  </span>
                  <span className="tnum font-semibold text-ink">
                    {formatBRL(inv.investedAmount)} → {formatBRL(inv.currentValue)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="rounded-lg border border-line bg-card2/60 px-3 py-2 text-xs text-mut">
              Resultado: investido {formatBRL(groupConfirm.reduce((a, i) => a + i.investedAmount, 0))} · atual{" "}
              {formatBRL(groupConfirm.reduce((a, i) => a + i.currentValue, 0))}. O histórico original
              fica salvo dentro da posição unificada.
            </p>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir investimento"
        message={
          <p>
            Excluir <strong className="text-ink">{pendingDelete?.name}</strong>? As movimentações de
            aporte vinculadas permanecem no histórico.
          </p>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            removeInvestment(pendingDelete.id);
            push("success", "Investimento excluído", pendingDelete.name);
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
