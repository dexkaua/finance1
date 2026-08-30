import { useMemo, useState } from "react";
import { useFinance } from "../contexts/FinanceContext";
import { INVESTMENT_TYPES, investmentTypeLabel } from "../data/categories";
import {
  currentMonthKey,
  formatDateBR,
  monthLongLabel,
  monthShortLabel,
  shiftMonthKey,
} from "../utils/date";
import {
  allocationByType,
  categoryTotals,
  investmentSummary,
  savingsRate,
  sumByType,
} from "../utils/finance";
import { formatBRL, formatPercent, formatSignedBRL } from "../utils/format";
import { Badge, Card, DeltaChip, PageHeader, SectionHeader } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { IconButton } from "../components/ui/Button";
import { CashflowChart, CashflowLegend } from "../components/charts/CashflowChart";
import { WealthChart } from "../components/charts/WealthChart";
import { CategoryBars } from "../components/charts/CategoryBars";
import { DonutChart } from "../components/charts/DonutChart";
import { IconChevronLeft, IconChevronRight } from "../components/ui/icons";
import type { MonthPoint } from "../types";

export function ReportsPage() {
  const { status, transactions, investments, refresh } = useFinance();
  const [month, setMonth] = useState(currentMonthKey());

  const months12 = useMemo(
    () => Array.from({ length: 12 }, (_, i) => shiftMonthKey(month, -(11 - i))),
    [month],
  );

  const model = useMemo(() => {
    const prevMonth = shiftMonthKey(month, -1);
    const receitas = sumByType(transactions, "receita", month);
    const despesas = sumByType(transactions, "despesa", month);
    const receitasPrev = sumByType(transactions, "receita", prevMonth);
    const despesasPrev = sumByType(transactions, "despesa", prevMonth);
    const resultSeries: MonthPoint[] = months12.map((key) => {
      const receita = sumByType(transactions, "receita", key);
      const despesa = sumByType(transactions, "despesa", key);
      return {
        month: key,
        label: monthShortLabel(key),
        receita,
        despesa,
        aporte: sumByType(transactions, "investimento", key),
        resultado: receita - despesa,
        patrimonio: 0,
      };
    });
    const endOfMonth = (key: string) => `${key}-31`;
    const wealth = months12.map((key) => {
      const end = endOfMonth(key);
      const cash = transactions.reduce((acc, tx) => {
        if (tx.date > end) return acc;
        return tx.type === "receita" ? acc + tx.amount : acc - tx.amount;
      }, 0);
      const invested = investments
        .filter((inv) => inv.startDate <= end)
        .reduce((acc, inv) => acc + inv.currentValue, 0);
      return { label: monthShortLabel(key), patrimonio: cash + invested };
    });
    return {
      receitas,
      despesas,
      resultado: receitas - despesas,
      resultadoPrev: receitasPrev - despesasPrev,
      receitasPrev,
      despesasPrev,
      rate: savingsRate(receitas, despesas),
      resultSeries,
      wealth,
      receitasPorCategoria: categoryTotals(transactions, "receita", month),
      despesasPorCategoria: categoryTotals(transactions, "despesa", month),
      summary: investmentSummary(investments),
      allocation: allocationByType(investments, INVESTMENT_TYPES),
      hasMovements: receitas > 0 || despesas > 0,
    };
  }, [transactions, investments, month, months12]);

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  const isCurrentMonth = month === currentMonthKey();

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Análise detalhada mês a mês">
        <div className="flex items-center gap-1 rounded-lg border border-line bg-card p-1">
          <IconButton label="Mês anterior" size="sm" onClick={() => setMonth((m) => shiftMonthKey(m, -1))}>
            <IconChevronLeft size={16} />
          </IconButton>
          <input
            type="month"
            aria-label="Selecione o mês do relatório"
            value={month}
            max={currentMonthKey()}
            onChange={(event) => {
              if (event.target.value) setMonth(event.target.value);
            }}
            className="tnum bg-transparent px-1 text-sm font-semibold text-ink focus:outline-none"
          />
          <IconButton
            label="Próximo mês"
            size="sm"
            disabled={isCurrentMonth}
            className={isCurrentMonth ? "pointer-events-none opacity-30" : ""}
            onClick={() => setMonth((m) => shiftMonthKey(m, 1))}
          >
            <IconChevronRight size={16} />
          </IconButton>
        </div>
      </PageHeader>

      {status === "loading" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-80" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="anim-rise font-display text-sm font-bold uppercase tracking-wide text-mut">
            {monthLongLabel(month)}
          </p>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: "Receitas",
                value: formatBRL(model.receitas),
                cls: "text-up",
                chip: <DeltaChip current={model.receitas} previous={model.receitasPrev} />,
              },
              {
                label: "Despesas",
                value: formatBRL(model.despesas),
                cls: "text-down",
                chip: <DeltaChip current={model.despesas} previous={model.despesasPrev} />,
              },
              {
                label: "Resultado do mês",
                value: formatSignedBRL(model.resultado),
                cls: model.resultado >= 0 ? "text-up" : "text-down",
                chip: <DeltaChip current={model.resultado} previous={model.resultadoPrev} />,
              },
              {
                label: "Taxa de economia",
                value: model.rate !== null ? formatPercent(model.rate, 0) : "—",
                cls: "text-inv",
                chip: (
                  <span className="text-[11px] font-medium text-mut">
                    da receita virou saldo no mês
                  </span>
                ),
              },
            ].map((tile, index) => (
              <Card key={tile.label} hover className="anim-rise p-4 sm:p-5">
                <div style={{ animationDelay: `${index * 60}ms` }}>
                  <p className="text-xs font-semibold text-mut sm:text-[13px]">{tile.label}</p>
                  <p className={`tnum mt-1.5 font-display text-lg font-bold sm:text-xl ${tile.cls}`}>
                    {tile.value}
                  </p>
                  <div className="mt-2">{tile.chip}</div>
                </div>
              </Card>
            ))}
          </div>

          {!model.hasMovements ? (
            <Card className="anim-rise">
              <EmptyState
                compact
                title="Sem movimentações neste mês"
                description="Navegue para outro mês ou registre lançamentos para ver o relatório."
              />
            </Card>
          ) : null}

          <Card className="anim-rise p-5" hover>
            <div style={{ animationDelay: "120ms" }}>
              <SectionHeader
                title="Resultado mensal"
                subtitle="Saldo de receitas menos despesas nos últimos 12 meses"
                aside={<CashflowLegend variant="result" />}
              />
              <CashflowChart data={model.resultSeries} variant="result" height={280} />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="anim-rise p-5" hover>
              <div style={{ animationDelay: "160ms" }}>
                <SectionHeader
                  title="Receitas por categoria"
                  subtitle={monthLongLabel(month)}
                  aside={<Badge tone="up">{formatBRL(model.receitas)}</Badge>}
                />
                <CategoryBars
                  items={model.receitasPorCategoria.map((item) => ({
                    label: item.label,
                    value: item.total,
                    pct: item.pct,
                    color: item.color,
                  }))}
                />
              </div>
            </Card>
            <Card className="anim-rise p-5" hover>
              <div style={{ animationDelay: "200ms" }}>
                <SectionHeader
                  title="Despesas por categoria"
                  subtitle={monthLongLabel(month)}
                  aside={<Badge tone="down">{formatBRL(model.despesas)}</Badge>}
                />
                <CategoryBars
                  items={model.despesasPorCategoria.map((item) => ({
                    label: item.label,
                    value: item.total,
                    pct: item.pct,
                    color: item.color,
                  }))}
                />
              </div>
            </Card>
          </div>

          <Card className="anim-rise p-5" hover>
            <div style={{ animationDelay: "240ms" }}>
              <SectionHeader
                title="Evolução do patrimônio"
                subtitle="Caixa líquido + investimentos, mês a mês"
              />
              <WealthChart data={model.wealth} height={280} />
            </div>
          </Card>

          <Card className="anim-rise overflow-hidden" hover>
            <div style={{ animationDelay: "280ms" }}>
              <div className="p-5">
                <SectionHeader
                  title="Investimentos"
                  subtitle={`${model.summary.count} posições · lucro acumulado de ${formatSignedBRL(model.summary.profit)}`}
                />
              </div>
              {investments.length === 0 ? (
                <p className="px-5 pb-6 text-sm text-mut">Nenhum investimento cadastrado.</p>
              ) : (
                <div className="flex flex-col gap-6 px-5 pb-5 lg:flex-row lg:items-center">
                  <DonutChart
                    slices={model.allocation}
                    centerLabel="Lucro total"
                    centerValue={`${model.summary.profitPct >= 0 ? "+" : "−"}${formatPercent(Math.abs(model.summary.profitPct), 0)}`}
                  />
                  <div className="min-w-0 flex-1 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-line text-[11px] uppercase tracking-wide text-mut">
                          <th className="pb-2 pr-3 font-semibold">Ativo</th>
                          <th className="pb-2 pr-3 font-semibold">Instituição</th>
                          <th className="tnum pb-2 pr-3 text-right font-semibold">Investido</th>
                          <th className="tnum pb-2 pr-3 text-right font-semibold">Atual</th>
                          <th className="tnum pb-2 pr-3 text-right font-semibold">Lucro</th>
                          <th className="tnum pb-2 text-right font-semibold">% carteira</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {[...investments]
                          .sort((a, b) => b.currentValue - a.currentValue)
                          .map((inv) => {
                            const profit = inv.currentValue - inv.investedAmount;
                            const share =
                              model.summary.current > 0
                                ? (inv.currentValue / model.summary.current) * 100
                                : 0;
                            return (
                              <tr key={inv.id} className="transition-colors hover:bg-card2/60">
                                <td className="py-2.5 pr-3">
                                  <span className="font-semibold text-ink">{inv.name}</span>
                                  <span className="block text-[11px] text-mut">
                                    {investmentTypeLabel(inv.type)} · desde {formatDateBR(inv.startDate)}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-3 text-mut">{inv.institution}</td>
                                <td className="tnum py-2.5 pr-3 text-right font-medium text-ink">
                                  {formatBRL(inv.investedAmount)}
                                </td>
                                <td className="tnum py-2.5 pr-3 text-right font-medium text-ink">
                                  {formatBRL(inv.currentValue)}
                                </td>
                                <td
                                  className={`tnum py-2.5 pr-3 text-right font-bold ${
                                    profit >= 0 ? "text-up" : "text-down"
                                  }`}
                                >
                                  {formatSignedBRL(profit)}
                                </td>
                                <td className="tnum py-2.5 text-right font-semibold text-mut">
                                  {formatPercent(share, 0)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
