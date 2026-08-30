import { useMemo, useState } from "react";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { downloadCsv } from "../utils/csv";
import {
  currentMonthKey,
  lastMonthKeys,
  monthLongLabel,
  monthShortLabel,
  shiftMonthKey,
  yearOf,
} from "../utils/date";
import {
  categoryTotals,
  isActive,
  monthResult,
  sumKind,
  totalDividends,
  wealthSeries,
  EXPENSE_KINDS,
  INCOME_KINDS,
} from "../utils/finance";
import { formatBRL, formatPercent, formatSignedBRL } from "../utils/format";
import { Badge, Card, DeltaChip, PageHeader, SectionHeader } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { CashflowChart, CashflowLegend } from "../components/charts/CashflowChart";
import { WealthChart } from "../components/charts/WealthChart";
import { CategoryBars } from "../components/charts/CategoryBars";
import { IconChevronLeft, IconChevronRight, IconDownload } from "../components/ui/icons";

type ViewMode = "mensal" | "anual" | "trimestral";

export function ReportsPage() {
  const { status, transactions, accounts, investments, assets, refresh } = useFinance();
  const { push } = useToast();
  const [month, setMonth] = useState(currentMonthKey());
  const [view, setView] = useState<ViewMode>("mensal");
  const [compareYear, setCompareYear] = useState(yearOf(`${currentMonthKey()}-01`));

  const months12 = useMemo(() => lastMonthKeys(12), []);

  const model = useMemo(() => {
    const prevMonth = shiftMonthKey(month, -1);
    const receitas = sumKind(transactions, INCOME_KINDS, month);
    const despesas = sumKind(transactions, EXPENSE_KINDS, month);
    const aportes = sumKind(transactions, ["aporte"], month);
    const dividendos = totalDividends(transactions, month);
    const resultSeries = months12.map((key) => ({
      month: key,
      label: monthShortLabel(key),
      receita: sumKind(transactions, INCOME_KINDS, key),
      despesa: sumKind(transactions, EXPENSE_KINDS, key),
      aporte: 0,
      resultado: monthResult(transactions, key),
      patrimonio: 0,
    }));
    const wealth = wealthSeries(accounts, investments, assets, transactions, months12);
    return {
      receitas,
      despesas,
      aportes,
      dividendos,
      resultado: receitas - despesas,
      resultadoPrev: monthResult(transactions, prevMonth),
      receitasPrev: sumKind(transactions, INCOME_KINDS, prevMonth),
      despesasPrev: sumKind(transactions, EXPENSE_KINDS, prevMonth),
      rate: receitas > 0 ? ((receitas - despesas) / receitas) * 100 : null,
      resultSeries,
      wealth,
      receitasPorCategoria: categoryTotals(transactions, "receita", month),
      despesasPorCategoria: categoryTotals(transactions, "despesa", month),
      hasMovements: receitas > 0 || despesas > 0,
    };
  }, [transactions, accounts, investments, assets, month, months12]);

  const yearly = useMemo(() => {
    const years = Array.from(
      new Set(transactions.filter(isActive).map((tx) => yearOf(tx.date))),
    ).sort();
    if (years.length === 0) years.push(yearOf(`${currentMonthKey()}-01`));
    const startYear = Number(years[0]);
    const endYear = Number(yearOf(`${currentMonthKey()}-01`));
    const all: number[] = [];
    for (let y = startYear; y <= Math.max(endYear, startYear + 1); y++) all.push(y);
    return all.map((year) => {
      const yearMonths = Array.from({ length: 12 }, (_, m) => `${year}-${String(m + 1).padStart(2, "0")}`);
      const receitas = yearMonths.reduce((acc, key) => acc + sumKind(transactions, INCOME_KINDS, key), 0);
      const despesas = yearMonths.reduce((acc, key) => acc + sumKind(transactions, EXPENSE_KINDS, key), 0);
      const aportes = yearMonths.reduce((acc, key) => acc + sumKind(transactions, ["aporte"], key), 0);
      const endOfYear = `${year}-12-31`;
      const patrimonio = wealthSeries(accounts, investments, assets, transactions, [month]).length >= 0
        ? (() => {
            const caixaInicial = accounts.reduce((a, acc2) => a + acc2.initialBalance, 0);
            let caixa = caixaInicial;
            for (const tx of transactions) {
              if (!isActive(tx) || tx.date > endOfYear) continue;
              if (tx.kind === "receita" || tx.kind === "dividendo" || tx.kind === "juros" || tx.kind === "estorno") caixa += tx.amount;
              else if (tx.kind === "despesa" || tx.kind === "taxa") caixa -= tx.amount;
              else if (tx.kind === "aporte") caixa -= tx.amount;
              else if (tx.kind === "resgate") caixa += tx.amount;
              else if (tx.kind === "ajuste") caixa += tx.direction === "out" ? -tx.amount : tx.amount;
            }
            const investido = investments
              .filter((inv) => inv.startDate <= endOfYear)
              .reduce((a, inv) => a + inv.currentValue, 0);
            return caixa + investido;
          })()
        : 0;
      return { year, receitas, despesas, resultado: receitas - despesas, aportes, patrimonio };
    });
  }, [transactions, accounts, investments, assets, month]);

  const quarters = useMemo(() => {
    const year = Number(compareYear);
    return [0, 1, 2, 3].map((quarter) => {
      const keys = [0, 1, 2].map((m) => `${year}-${String(quarter * 3 + m + 1).padStart(2, "0")}`);
      const receitas = keys.reduce((acc, key) => acc + sumKind(transactions, INCOME_KINDS, key), 0);
      const despesas = keys.reduce((acc, key) => acc + sumKind(transactions, EXPENSE_KINDS, key), 0);
      return { label: `T${quarter + 1}`, receitas, despesas, resultado: receitas - despesas };
    });
  }, [transactions, compareYear]);

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  const isCurrentMonth = month === currentMonthKey();

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Mensal, trimestral e anual — histórico nunca é perdido">
        <div className="flex gap-1 rounded-lg border border-line bg-card2 p-1">
          {(["mensal", "trimestral", "anual"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-semibold capitalize transition-all ${view === mode ? "border border-line bg-card text-ink shadow-sm" : "text-mut hover:text-ink"}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<IconDownload size={15} />}
          onClick={() => {
            downloadCsv(
              "relatorio-anual.csv",
              ["Ano", "Receitas", "Despesas", "Resultado", "Aportes", "Patrimônio fim de ano"],
              yearly.map((row) => [
                row.year,
                row.receitas.toFixed(2).replace(".", ","),
                row.despesas.toFixed(2).replace(".", ","),
                row.resultado.toFixed(2).replace(".", ","),
                row.aportes.toFixed(2).replace(".", ","),
                row.patrimonio.toFixed(2).replace(".", ","),
              ]),
            );
            push("success", "Relatório exportado", "Comparação anual em CSV.");
          }}
        >
          Exportar anual
        </Button>
      </PageHeader>

      {status === "loading" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : view === "mensal" ? (
        <div className="space-y-4">
          <div className="anim-rise flex flex-wrap items-center justify-between gap-2">
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
            <p className="font-display text-sm font-bold uppercase tracking-wide text-mut">{monthLongLabel(month)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { label: "Receitas", value: formatBRL(model.receitas), cls: "text-up", chip: <DeltaChip current={model.receitas} previous={model.receitasPrev} /> },
              { label: "Despesas", value: formatBRL(model.despesas), cls: "text-down", chip: <DeltaChip current={model.despesas} previous={model.despesasPrev} /> },
              { label: "Resultado", value: formatSignedBRL(model.resultado), cls: model.resultado >= 0 ? "text-up" : "text-down", chip: <DeltaChip current={model.resultado} previous={model.resultadoPrev} /> },
              { label: "Aportes", value: formatBRL(model.aportes), cls: "text-inv", chip: <span className="text-[11px] font-medium text-mut">para investimentos</span> },
              { label: "Taxa de economia", value: model.rate !== null ? formatPercent(model.rate, 0) : "—", cls: "text-gold", chip: <span className="text-[11px] font-medium text-mut">da receita virou saldo</span> },
            ].map((tile, index) => (
              <Card key={tile.label} hover className="anim-rise p-4">
                <div style={{ animationDelay: `${index * 50}ms` }}>
                  <p className="text-xs font-semibold text-mut">{tile.label}</p>
                  <p className={`tnum mt-1.5 font-display text-lg font-bold ${tile.cls}`}>{tile.value}</p>
                  <div className="mt-2">{tile.chip}</div>
                </div>
              </Card>
            ))}
          </div>

          {transactions.length === 0 ? (
            <Card className="anim-rise">
              <EmptyState
                title="Sem dados suficientes para gerar relatórios"
                description="Assim que você registrar movimentações, as receitas, despesas, categorias e a evolução patrimonial aparecem aqui — com todo o histórico preservado."
              />
            </Card>
          ) : !model.hasMovements ? (
            <Card className="anim-rise">
              <EmptyState compact title="Sem movimentações neste mês" description="Navegue para outro mês para ver o relatório." />
            </Card>
          ) : null}

          {transactions.length > 0 ? (
          <Card className="anim-rise p-5">
            <div style={{ animationDelay: "120ms" }}>
              <SectionHeader title="Resultado mensal" subtitle="Últimos 12 meses" aside={<CashflowLegend variant="result" />} />
              <CashflowChart data={model.resultSeries} variant="result" height={280} />
            </div>
          </Card>
          ) : null}

          {transactions.length > 0 ? (
          <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="anim-rise p-5" hover>
              <div style={{ animationDelay: "160ms" }}>
                <SectionHeader title="Receitas por categoria" subtitle={monthLongLabel(month)} aside={<Badge tone="up">{formatBRL(model.receitas)}</Badge>} />
                <CategoryBars items={model.receitasPorCategoria.map((item) => ({ label: item.path, value: item.total, pct: item.pct, color: item.color }))} />
              </div>
            </Card>
            <Card className="anim-rise p-5" hover>
              <div style={{ animationDelay: "200ms" }}>
                <SectionHeader title="Despesas por categoria" subtitle={monthLongLabel(month)} aside={<Badge tone="down">{formatBRL(model.despesas)}</Badge>} />
                <CategoryBars items={model.despesasPorCategoria.map((item) => ({ label: item.path, value: item.total, pct: item.pct, color: item.color }))} />
              </div>
            </Card>
          </div>

          <Card className="anim-rise p-5">
            <div style={{ animationDelay: "240ms" }}>
              <SectionHeader title="Evolução do patrimônio" subtitle="Caixa + investimentos + bens" />
              <WealthChart data={model.wealth.map((point) => ({ label: point.label, patrimonio: point.patrimonio }))} height={280} />
            </div>
          </Card>
          </>
          ) : null}
        </div>
      ) : view === "trimestral" ? (
        <Card className="anim-rise p-5">
          <SectionHeader
            title={`Trimestres de ${compareYear}`}
            aside={
              <div className="flex items-center gap-1 rounded-lg border border-line bg-card p-1">
                <IconButton label="Ano anterior" size="sm" onClick={() => setCompareYear((y) => String(Number(y) - 1))}>
                  <IconChevronLeft size={16} />
                </IconButton>
                <span className="tnum px-2 text-sm font-bold text-ink">{compareYear}</span>
                <IconButton
                  label="Próximo ano"
                  size="sm"
                  disabled={Number(compareYear) >= Number(yearOf(`${currentMonthKey()}-01`))}
                  className={Number(compareYear) >= Number(yearOf(`${currentMonthKey()}-01`)) ? "pointer-events-none opacity-30" : ""}
                  onClick={() => setCompareYear((y) => String(Number(y) + 1))}
                >
                  <IconChevronRight size={16} />
                </IconButton>
              </div>
            }
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {quarters.map((quarter) => (
              <div key={quarter.label} className="rounded-xl border border-line bg-card2/60 p-4">
                <p className="font-display text-base font-bold text-ink">{quarter.label}</p>
                <p className="tnum mt-2 text-sm font-semibold text-up">{formatBRL(quarter.receitas)}</p>
                <p className="tnum text-sm font-semibold text-down">{formatBRL(quarter.despesas)}</p>
                <p className={`tnum mt-1.5 font-display text-lg font-bold ${quarter.resultado >= 0 ? "text-up" : "text-down"}`}>
                  {formatSignedBRL(quarter.resultado)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="anim-rise overflow-hidden">
          <div className="p-5 pb-3">
            <SectionHeader title="Comparação entre anos" subtitle="Receitas, despesas, resultado, aportes e patrimônio — todo o histórico preservado" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <thead className="bg-card2/70">
                <tr className="text-[11px] uppercase tracking-wide text-mut">
                  <th className="px-5 py-2.5 font-semibold">Ano</th>
                  <th className="tnum px-3 py-2.5 text-right font-semibold">Receitas</th>
                  <th className="tnum px-3 py-2.5 text-right font-semibold">Despesas</th>
                  <th className="tnum px-3 py-2.5 text-right font-semibold">Resultado</th>
                  <th className="tnum px-3 py-2.5 text-right font-semibold">Aportes</th>
                  <th className="tnum px-5 py-2.5 text-right font-semibold">Patrimônio (fim)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {yearly.map((row) => (
                  <tr key={row.year} className="transition-colors hover:bg-card2/60">
                    <td className="px-5 py-3 font-display font-bold text-ink">{row.year}</td>
                    <td className="tnum px-3 py-3 text-right font-semibold text-up">{formatBRL(row.receitas)}</td>
                    <td className="tnum px-3 py-3 text-right font-semibold text-down">{formatBRL(row.despesas)}</td>
                    <td className={`tnum px-3 py-3 text-right font-bold ${row.resultado >= 0 ? "text-up" : "text-down"}`}>
                      {formatSignedBRL(row.resultado)}
                    </td>
                    <td className="tnum px-3 py-3 text-right font-medium text-inv">{formatBRL(row.aportes)}</td>
                    <td className="tnum px-5 py-3 text-right font-bold text-ink">{formatBRL(row.patrimonio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-[11px] text-mut">
        Períodos com dados: {monthlyPeriodsCount(transactions)} meses registrados · dividendos do mês: {formatBRL(model.dividendos)}.
      </p>
    </div>
  );
}

function monthlyPeriodsCount(transactions: Array<{ date: string }>): number {
  return new Set(transactions.map((tx) => tx.date.slice(0, 7))).size;
}
