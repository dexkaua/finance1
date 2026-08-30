import { useMemo, type ReactNode } from "react";
import type { Page, Transaction } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import {
  currentMonthKey,
  formatDayMonth,
  greeting,
  lastMonthKeys,
  monthLongLabel,
  shiftMonthKey,
} from "../utils/date";
import {
  buildMonthPoints,
  categoryTotals,
  getCategory,
  liquidBalance,
  sortTransactionsDesc,
  sumByType,
} from "../utils/finance";
import { formatBRL, formatSignedBRL } from "../utils/format";
import { goalColorHex } from "../data/categories";
import { Badge, Card, DeltaChip, PageHeader, ProgressBar, SectionHeader } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCoins,
  IconTarget,
  IconTrendUp,
  IconWallet,
} from "../components/ui/icons";
import { CashflowChart, CashflowLegend } from "../components/charts/CashflowChart";
import { WealthChart } from "../components/charts/WealthChart";
import { CategoryBars } from "../components/charts/CategoryBars";

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map(
      (value, index) =>
        `${((index / (values.length - 1)) * 100).toFixed(2)},${(33 - ((value - min) / range) * 28).toFixed(2)}`,
    )
    .join(" ");
  return (
    <svg viewBox="0 0 100 36" className="h-16 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,36 ${points} 100,36`} fill="var(--up)" opacity="0.12" />
      <polyline
        points={points}
        fill="none"
        stroke="var(--up)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const TILE_TONES = {
  up: "bg-up/10 text-up",
  down: "bg-down/10 text-down",
  inv: "bg-inv/10 text-inv",
  gold: "bg-gold/10 text-gold",
} as const;

function Tile({
  label,
  value,
  icon,
  tone,
  delay,
  valueClass = "text-ink",
  children,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: keyof typeof TILE_TONES;
  delay: number;
  valueClass?: string;
  children?: ReactNode;
}) {
  return (
    <Card hover className="anim-rise p-5" >
      <div style={{ animationDelay: `${delay}ms` }}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-mut">{label}</p>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TILE_TONES[tone]}`}>
            {icon}
          </span>
        </div>
        <p className={`tnum mt-2 font-display text-[22px] font-bold leading-none ${valueClass}`}>
          {value}
        </p>
        <div className="mt-2.5">{children}</div>
      </div>
    </Card>
  );
}

function TransactionRow({ tx, delay }: { tx: Transaction; delay: number }) {
  const category = getCategory(tx.categoryId);
  const isReceita = tx.type === "receita";
  const isAporte = tx.type === "investimento";
  return (
    <li
      className="anim-rise flex items-center gap-3 px-5 py-3 transition-colors hover:bg-card2/60"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          isReceita ? "bg-up/10 text-up" : isAporte ? "bg-inv/10 text-inv" : "bg-down/10 text-down"
        }`}
      >
        {isReceita ? (
          <IconArrowUpRight size={17} />
        ) : isAporte ? (
          <IconCoins size={17} />
        ) : (
          <IconArrowDownRight size={17} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{tx.description}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-mut">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: category?.color ?? "#8b949e" }}
          />
          {category?.label ?? tx.categoryId} · {formatDayMonth(tx.date)}
        </p>
      </div>
      <span
        className={`tnum shrink-0 text-sm font-bold ${
          isReceita ? "text-up" : isAporte ? "text-inv" : "text-down"
        }`}
      >
        {isAporte ? formatBRL(tx.amount) : formatSignedBRL(isReceita ? tx.amount : -tx.amount)}
      </span>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 h-64 md:col-span-6 lg:col-span-4 lg:row-span-2" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="col-span-12 h-32 sm:col-span-6 md:col-span-3 lg:col-span-4" />
        ))}
      </div>
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 h-80 lg:col-span-7" />
        <Skeleton className="col-span-12 h-80 lg:col-span-5" />
      </div>
    </div>
  );
}

export function DashboardPage({ navigate }: { navigate: (page: Page) => void }) {
  const { status, transactions, investments, goals, refresh, openTransactionModal } = useFinance();
  const month = currentMonthKey();
  const prevMonth = useMemo(() => shiftMonthKey(month, -1), [month]);

  const model = useMemo(() => {
    const pontos = buildMonthPoints(transactions, investments, lastMonthKeys(6));
    const receitasMes = sumByType(transactions, "receita", month);
    const despesasMes = sumByType(transactions, "despesa", month);
    const receitasPrev = sumByType(transactions, "receita", prevMonth);
    const despesasPrev = sumByType(transactions, "despesa", prevMonth);
    const saldo = liquidBalance(transactions);
    const investedTotal = investments.reduce((acc, inv) => acc + inv.investedAmount, 0);
    const currentTotal = investments.reduce((acc, inv) => acc + inv.currentValue, 0);
    return {
      pontos,
      receitasMes,
      despesasMes,
      resultadoMes: receitasMes - despesasMes,
      resultadoPrev: receitasPrev - despesasPrev,
      receitasPrev,
      despesasPrev,
      saldo,
      saldoPrev: saldo - (receitasMes - despesasMes - sumByType(transactions, "investimento", month)),
      investedTotal,
      patrimonio: saldo + currentTotal,
      recent: sortTransactionsDesc(transactions).slice(0, 7),
      topDespesas: categoryTotals(transactions, "despesa", month).slice(0, 4),
      goalsPreview: [...goals].sort((a, b) => (a.deadline < b.deadline ? -1 : 1)).slice(0, 3),
    };
  }, [transactions, investments, goals, month, prevMonth]);

  const animatedSaldo = useAnimatedNumber(model.saldo);

  if (status === "loading") {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Carregando sua vida financeira…" />
        <DashboardSkeleton />
      </div>
    );
  }

  if (status === "error") {
    return <ErrorState onRetry={() => void refresh()} />;
  }

  const saldoPositive = model.saldo >= 0;

  return (
    <div>
      <PageHeader
        title={`${greeting()}!`}
        subtitle={`Visão geral de ${monthLongLabel(month).toLowerCase()}.`}
      />

      <div className="grid grid-cols-12 gap-4">
        {/* Saldo atual */}
        <Card className="anim-rise relative col-span-12 overflow-hidden p-5 md:col-span-6 lg:col-span-4 lg:row-span-2">
          <div className="dotgrid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-mut">Saldo atual em conta</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine-600/15 text-pine-600 dark:bg-up/10 dark:text-up">
                <IconWallet size={17} />
              </span>
            </div>
            <p
              className={`tnum mt-3 font-display text-[34px] font-bold leading-none tracking-tight ${
                saldoPositive ? "text-ink" : "text-down"
              }`}
            >
              {formatBRL(animatedSaldo)}
            </p>
            <div className="mt-2.5">
              <DeltaChip current={model.saldo} previous={model.saldoPrev} />
            </div>
            <div className="mt-5 border-t border-dashed border-line pt-4">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-semibold text-mut">Patrimônio total</p>
                <Badge tone="up">conta + investimentos</Badge>
              </div>
              <p className="tnum mt-1 font-display text-xl font-bold text-ink">
                {formatBRL(model.patrimonio)}
              </p>
            </div>
            <div className="mt-3">
              <Sparkline values={model.pontos.map((p) => p.patrimonio)} />
              <p className="mt-1 text-[11px] text-mut">Evolução do patrimônio · últimos 6 meses</p>
            </div>
          </div>
        </Card>

        {/* Tiles do mês */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <Tile
            label="Receitas do mês"
            value={formatBRL(model.receitasMes)}
            icon={<IconArrowUpRight size={16} />}
            tone="up"
            delay={60}
          >
            <DeltaChip current={model.receitasMes} previous={model.receitasPrev} />
          </Tile>
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <Tile
            label="Despesas do mês"
            value={formatBRL(model.despesasMes)}
            icon={<IconArrowDownRight size={16} />}
            tone="down"
            delay={120}
          >
            <DeltaChip current={model.despesasMes} previous={model.despesasPrev} />
          </Tile>
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <Tile
            label="Resultado do mês"
            value={formatSignedBRL(model.resultadoMes)}
            icon={<IconTrendUp size={16} />}
            tone={model.resultadoMes >= 0 ? "up" : "down"}
            valueClass={model.resultadoMes >= 0 ? "text-up" : "text-down"}
            delay={180}
          >
            <DeltaChip current={model.resultadoMes} previous={model.resultadoPrev} />
          </Tile>
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <Tile
            label="Total investido"
            value={formatBRL(model.investedTotal)}
            icon={<IconCoins size={16} />}
            tone="inv"
            delay={240}
          >
            <span className="text-[11px] font-medium text-mut">
              {investments.length} {investments.length === 1 ? "posição aberta" : "posições abertas"}
            </span>
          </Tile>
        </div>
      </div>

      {/* Gráficos */}
      <div className="mt-4 grid grid-cols-12 gap-4">
        <Card className="anim-rise col-span-12 p-5 lg:col-span-7" hover>
          <div style={{ animationDelay: "120ms" }}>
            <SectionHeader
              title="Receitas × Despesas"
              subtitle="Fluxo de caixa dos últimos 6 meses"
              aside={<CashflowLegend variant="dual" />}
            />
            <CashflowChart data={model.pontos} variant="dual" />
          </div>
        </Card>
        <Card className="anim-rise col-span-12 p-5 lg:col-span-5" hover>
          <div style={{ animationDelay: "180ms" }}>
            <SectionHeader
              title="Evolução do patrimônio"
              subtitle="Conta + valor de mercado dos investimentos"
            />
            <WealthChart data={model.pontos.map((p) => ({ label: p.label, patrimonio: p.patrimonio }))} />
          </div>
        </Card>
      </div>

      {/* Últimas movimentações + resumos */}
      <div className="mt-4 grid grid-cols-12 gap-4">
        <Card className="anim-rise col-span-12 overflow-hidden lg:col-span-7">
          <div style={{ animationDelay: "220ms" }}>
            <SectionHeader
              title="Últimas movimentações"
              subtitle="Seus lançamentos mais recentes"
              aside={
                <button
                  type="button"
                  onClick={() => navigate("movimentacoes")}
                  className="text-[13px] font-semibold text-up transition-colors hover:text-pine-700 dark:hover:text-up"
                >
                  Ver todas →
                </button>
              }
            />
            {model.recent.length === 0 ? (
              <EmptyState
                compact
                icon={<IconWallet size={22} />}
                title="Nenhuma movimentação ainda"
                description="Adicione sua primeira receita ou despesa para começar."
                action={
                  <button
                    type="button"
                    onClick={() => openTransactionModal()}
                    className="text-sm font-semibold text-up hover:underline"
                  >
                    + Adicionar movimentação
                  </button>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {model.recent.map((tx, index) => (
                  <TransactionRow key={tx.id} tx={tx} delay={240 + index * 40} />
                ))}
              </ul>
            )}
          </div>
        </Card>

        <div className="col-span-12 space-y-4 lg:col-span-5">
          <Card className="anim-rise p-5" hover>
            <div style={{ animationDelay: "260ms" }}>
              <SectionHeader
                title="Para onde foi o dinheiro"
                subtitle="Maiores categorias de despesa do mês"
              />
              <CategoryBars
                items={model.topDespesas.map((item) => ({
                  label: item.label,
                  value: item.total,
                  pct: item.pct,
                  color: item.color,
                }))}
                max={4}
              />
            </div>
          </Card>

          <Card className="anim-rise p-5" hover>
            <div style={{ animationDelay: "300ms" }}>
              <SectionHeader
                title="Metas em andamento"
                aside={
                  <button
                    type="button"
                    onClick={() => navigate("metas")}
                    className="flex items-center gap-1 text-[13px] font-semibold text-up hover:underline"
                  >
                    <IconTarget size={14} /> Ver metas
                  </button>
                }
              />
              {model.goalsPreview.length === 0 ? (
                <p className="py-4 text-sm text-mut">Nenhuma meta criada ainda.</p>
              ) : (
                <ul className="space-y-4">
                  {model.goalsPreview.map((goal) => {
                    const pct = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
                    return (
                      <li key={goal.id}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                          <span className="truncate font-semibold text-ink">{goal.name}</span>
                          <span className="tnum font-semibold text-mut">
                            {Math.round(Math.min(1, pct) * 100)}%
                          </span>
                        </div>
                        <ProgressBar value={pct} color={goalColorHex(goal.color)} />
                        <p className="tnum mt-1 text-[11px] text-mut">
                          {formatBRL(goal.currentAmount)} de {formatBRL(goal.targetAmount)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
