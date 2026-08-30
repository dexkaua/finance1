import { useMemo, useState } from "react";
import type { Page } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { KIND_META, categoryPath } from "../data/categories";
import {
  addDaysISO,
  currentMonthKey,
  dayInMonth,
  formatDayMonth,
  lastMonthKeys,
  monthShortLabel,
  shiftMonthKey,
  todayISO,
} from "../utils/date";
import {
  budgetStatuses,
  cardLimitUsed,
  checkDataQuality,
  computeScore,
  isActive,
  monthResult,
  sortTransactionsDesc,
  sumKind,
  wealthSeries,
  wealthSnapshot,
  EXPENSE_KINDS,
  INCOME_KINDS,
} from "../utils/finance";
import { clamp, formatBRL, formatBRLCompact, formatPercent, formatSignedBRL } from "../utils/format";
import { Badge, Card, DeltaChip, ProgressBar, SectionHeader } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button } from "../components/ui/Button";
import { CashflowChart, CashflowLegend } from "../components/charts/CashflowChart";
import { WealthChart } from "../components/charts/WealthChart";
import {
  IconArrowUpRight,
  IconBank,
  IconCalendar,
  IconChart,
  IconCoins,
  IconSearch,
  IconSwap,
  IconTarget,
  IconTrendUp,
  IconWallet,
} from "../components/ui/icons";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardPage({ navigate }: { navigate: (page: Page) => void }) {
  const { status, appData, settings, updateSettings, openTransactionModal, refresh } = useFinance();
  const [editingWidgets, setEditingWidgets] = useState(false);

  const { transactions, accounts, cards, investments, debts, goals, budgets, assets, invoiceExtras, invoicePayments, recurrences } = appData;
  const month = currentMonthKey();

  const model = useMemo(() => {
    const snapshot = wealthSnapshot(accounts, investments, assets, debts, cards, transactions, invoiceExtras, invoicePayments);
    const receitas = sumKind(transactions, INCOME_KINDS, month);
    const despesas = sumKind(transactions, EXPENSE_KINDS, month);
    const aportes = sumKind(transactions, ["aporte"], month);
    const prevMonth = shiftMonthKey(month, -1);
    const lastYearMonth = shiftMonthKey(month, -12);
    const series = wealthSeries(accounts, investments, assets, transactions, lastMonthKeys(12));
    const currentWealth = series[series.length - 1]?.patrimonio ?? snapshot.netWorth;
    const prevMonthWealth = series[series.length - 2]?.patrimonio ?? currentWealth;
    const prevYearWealth = series[0]?.patrimonio ?? currentWealth;
    const resultSeries = lastMonthKeys(6).map((key) => ({
      label: monthShortLabel(key),
      receita: sumKind(transactions, INCOME_KINDS, key),
      despesa: sumKind(transactions, EXPENSE_KINDS, key),
      resultado: monthResult(transactions, key),
    }));
    const recent = sortTransactionsDesc(transactions.filter(isActive)).slice(0, 6);
    const upcoming = transactions
      .filter((tx) => isActive(tx) && tx.date >= todayISO() && tx.date <= addDaysISO(todayISO(), 7))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, 5);
    const debtsDue = debts
      .filter((debt) => debt.balance > 0)
      .map((debt) => ({
        id: `debt-${debt.id}`,
        label: `Parcela ${debt.creditor}`,
        date: dayInMonth(month, debt.dueDay),
        amount: debt.monthlyPayment,
      }))
      .filter((item) => item.date >= todayISO() && item.date <= addDaysISO(todayISO(), 7));
    const score = computeScore(appData);
    const issues = checkDataQuality(appData);
    const budgetsOver = budgetStatuses(budgets, transactions).filter((s) => s.exceeded);
    const cardUsed = cards.reduce((acc, card) => acc + cardLimitUsed(card, transactions, invoiceExtras, invoicePayments), 0);
    const savingsRate = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : null;
    return {
      snapshot,
      receitas,
      despesas,
      aportes,
      resultadoMes: monthResult(transactions, month),
      resultadoPrev: monthResult(transactions, prevMonth),
      resultadoYearAgo: monthResult(transactions, lastYearMonth),
      currentWealth,
      prevMonthWealth,
      prevYearWealth,
      series,
      resultSeries,
      recent,
      upcoming: [...debtsDue, ...upcoming.map((tx) => ({ id: tx.id, label: tx.description, date: tx.date, amount: tx.amount }))].slice(0, 6),
      score,
      issues,
      budgetsOver,
      cardUsed,
      savingsRate,
    };
  }, [appData, accounts, investments, assets, debts, cards, transactions, invoiceExtras, invoicePayments, budgets, month]);

  const animatedWealth = useAnimatedNumber(model.currentWealth);

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const widgets = settings.dashboardWidgets;
  const show = (key: string) => widgets[key] !== false;

  const tiles: Array<{ key: string; label: string; value: string; cls: string; icon: JSX.Element; onClick: () => void; chip?: JSX.Element }> = [
    {
      key: "available",
      label: "Saldo em contas",
      value: formatBRL(model.snapshot.accounts),
      cls: model.snapshot.accounts >= 0 ? "text-ink" : "text-down",
      icon: <IconWallet size={17} />,
      onClick: () => navigate("contas"),
      chip: <span className="text-[11px] font-medium text-mut">{accounts.length} contas · separado de investimentos</span>,
    },
    {
      key: "investments",
      label: "Investimentos",
      value: formatBRL(model.snapshot.investments),
      cls: "text-ink",
      icon: <IconTrendUp size={17} />,
      onClick: () => navigate("investimentos"),
      chip: (
        <span className={`text-[11px] font-semibold ${model.snapshot.investments - investments.reduce((a, i) => a + i.investedAmount, 0) >= 0 ? "text-up" : "text-down"}`}>
          {formatSignedBRL(model.snapshot.investments - investments.reduce((a, i) => a + i.investedAmount, 0))} lucro
        </span>
      ),
    },
    {
      key: "debts",
      label: "Dívidas + faturas",
      value: formatBRL(model.snapshot.liabilities),
      cls: "text-down",
      icon: <IconBank size={17} />,
      onClick: () => navigate("dividas"),
      chip: <span className="text-[11px] font-medium text-mut">cartão: {formatBRLCompact(model.cardUsed)} em uso</span>,
    },
    {
      key: "income",
      label: "Receitas do mês",
      value: formatBRL(model.receitas),
      cls: "text-up",
      icon: <IconArrowUpRight size={17} />,
      onClick: () => navigate("movimentacoes"),
    },
    {
      key: "expenses",
      label: "Despesas do mês",
      value: formatBRL(model.despesas),
      cls: "text-down",
      icon: <IconSwap size={17} />,
      onClick: () => navigate("movimentacoes"),
      chip: <DeltaChip current={model.despesas} previous={sumKind(transactions, EXPENSE_KINDS, shiftMonthKey(month, -1))} />,
    },
    {
      key: "contributions",
      label: "Aportes do mês",
      value: formatBRL(model.aportes),
      cls: "text-inv",
      icon: <IconCoins size={17} />,
      onClick: () => navigate("investimentos"),
    },
    {
      key: "savings",
      label: "Taxa de poupança",
      value: model.savingsRate !== null ? formatPercent(model.savingsRate, 0) : "—",
      cls: "text-gold",
      icon: <IconChart size={17} />,
      onClick: () => navigate("orcamentos"),
      chip: <span className="text-[11px] font-medium text-mut">da receita fica com você</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Hero: patrimônio líquido */}
      <Card className="anim-rise relative overflow-hidden p-6">
        <div className="dotgrid pointer-events-none absolute inset-0 opacity-40" />
        <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-pine-500/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-mut">
              {greeting()}
              {settings.userName ? `, ${settings.userName.trim().split(/\s+/)[0]}` : ""} — seu panorama de{" "}
              {monthShortLabel(month)}
            </p>
            {show("networth") ? (
              <>
                <p className="mt-2 text-[13px] font-semibold text-mut">Patrimônio líquido</p>
                <p className="tnum font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                  {formatBRL(animatedWealth)}
                </p>
              </>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
              <span className="flex items-center gap-1.5 font-semibold text-up">
                <IconTrendUp size={15} />
                {formatSignedBRL(model.currentWealth - model.prevMonthWealth)} vs mês passado
              </span>
              <span className="font-medium text-mut">
                {formatSignedBRL(model.currentWealth - model.prevYearWealth)} em 12 meses
              </span>
              <span className={`font-semibold ${model.resultadoMes >= model.resultadoPrev ? "text-up" : "text-down"}`}>
                resultado do mês {formatSignedBRL(model.resultadoMes)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => navigate("saude")}
              className="group flex items-center gap-3 rounded-xl border border-line bg-card/80 px-4 py-3 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-left">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-mut">Score financeiro</span>
                <span className="text-[10px] text-mut">
                  {model.issues.length > 0 ? `${model.issues.length} pendência(s) de dados` : "dados íntegros"}
                </span>
              </span>
              <span
                className={`tnum font-display text-2xl font-bold ${model.score.score >= 70 ? "text-up" : model.score.score >= 45 ? "text-gold" : "text-down"}`}
              >
                {model.score.score}
              </span>
            </button>
            <Button variant="secondary" size="sm" icon={<IconSearch size={14} />} onClick={() => navigate("assistente")}>
              Pergunte ao sistema
            </Button>
          </div>
        </div>
      </Card>

      {/* Tiles configuráveis */}
      <div>
        <div className="mb-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setEditingWidgets((v) => !v)}
            className="text-xs font-semibold text-mut transition-colors hover:text-ink"
          >
            {editingWidgets ? "Concluir personalização" : "Personalizar cards"}
          </button>
        </div>
        {editingWidgets ? (
          <div className="anim-fadein mb-3 flex flex-wrap gap-2">
            {tiles.map((tile) => {
              const enabled = show(tile.key);
              return (
                <button
                  key={tile.key}
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => updateSettings({ dashboardWidgets: { ...widgets, [tile.key]: !enabled } })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${enabled ? "border-up/40 bg-up/10 text-up" : "border-line bg-card text-mut"}`}
                >
                  {tile.label}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {tiles.filter((tile) => show(tile.key)).map((tile, index) => (
            <button
              key={tile.key}
              type="button"
              onClick={tile.onClick}
              className="anim-rise rounded-xl border border-line bg-card p-4 text-left shadow-sm shadow-black/[0.03] transition-all duration-200 hover:-translate-y-0.5 hover:border-linestrong hover:shadow-md"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-mut">{tile.label}</p>
                <span className="text-mut/70">{tile.icon}</span>
              </div>
              <p className={`tnum mt-2 font-display text-lg font-bold sm:text-xl ${tile.cls}`}>{tile.value}</p>
              {tile.chip ? <div className="mt-1.5">{tile.chip}</div> : null}
            </button>
          ))}
        </div>
      </div>

      {/* Primeiro uso: guia de início (somente com o sistema zerado) */}
      {status === "ready" && transactions.length === 0 && accounts.length === 0 ? (
        <Card className="anim-rise relative overflow-hidden">
          <div className="dotgrid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative p-5 sm:p-6">
            <p className="font-display text-lg font-bold text-ink">Bem-vindo! Comece sua vida financeira do zero</p>
            <p className="mt-1 max-w-xl text-sm text-mut">
              O sistema está limpo, sem nenhum dado de exemplo. Siga os três passos abaixo — os
              gráficos, relatórios e indicadores se constroem a partir do que você cadastrar.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Crie sua primeira conta",
                  desc: "Corrente, poupança, carteira… o saldo nasce das movimentações.",
                  icon: <IconWallet size={18} />,
                  action: () => navigate("contas"),
                  cta: "Adicionar conta",
                },
                {
                  step: "2",
                  title: "Lance receitas e despesas",
                  desc: "Salário, mercado, aluguel — com categoria e data.",
                  icon: <IconSwap size={18} />,
                  action: () => openTransactionModal(),
                  cta: "Nova movimentação",
                },
                {
                  step: "3",
                  title: "Cadastre investimentos",
                  desc: "Tesouro, CDB, ações… com rentabilidade configurável.",
                  icon: <IconChart size={18} />,
                  action: () => navigate("investimentos"),
                  cta: "Novo investimento",
                },
              ].map((item, index) => (
                <button
                  key={item.step}
                  type="button"
                  onClick={item.action}
                  className="group anim-rise flex flex-col items-start gap-2 rounded-xl border border-line bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-pine-500/50 hover:shadow-md"
                  style={{ animationDelay: `${120 + index * 80}ms` }}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pine-600 font-display text-[13px] font-bold text-paper">
                      {item.step}
                    </span>
                    <span className="text-up">{item.icon}</span>
                  </span>
                  <span className="font-display text-sm font-bold text-ink">{item.title}</span>
                  <span className="text-xs leading-relaxed text-mut">{item.desc}</span>
                  <span className="mt-1 text-xs font-bold text-up group-hover:underline">{item.cta} →</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="anim-rise p-5" hover>
          <div style={{ animationDelay: "140ms" }}>
            <SectionHeader
              title="Receitas × despesas"
              subtitle="Últimos 6 meses"
              aside={transactions.length > 0 ? <CashflowLegend /> : undefined}
            />
            {transactions.length === 0 ? (
              <EmptyState
                compact
                icon={<IconChart size={20} />}
                title="Sem dados suficientes para exibir este gráfico"
                description="Registre receitas e despesas e o comparativo aparece automaticamente."
              />
            ) : (
              <CashflowChart data={model.resultSeries} height={240} />
            )}
          </div>
        </Card>
        <Card className="anim-rise p-5" hover>
          <div style={{ animationDelay: "180ms" }}>
            <SectionHeader
              title="Evolução do patrimônio"
              subtitle="Caixa + investimentos + bens (12 meses)"
              aside={
                transactions.length > 0 ? (
                  <button type="button" onClick={() => navigate("patrimonio")} className="text-xs font-semibold text-inv hover:underline">
                    detalhes
                  </button>
                ) : undefined
              }
            />
            {transactions.length === 0 ? (
              <EmptyState
                compact
                icon={<IconChart size={20} />}
                title="Sem dados suficientes para exibir este gráfico"
                description="Com contas e movimentações, a curva do patrimônio é desenhada aqui."
              />
            ) : (
              <WealthChart data={model.series.map((p) => ({ label: p.label, patrimonio: p.patrimonio }))} height={240} />
            )}
          </div>
        </Card>
      </div>

      {/* Colunas: movimentações / próximos vencimentos / metas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="anim-rise overflow-hidden" hover>
          <div style={{ animationDelay: "220ms" }}>
            <div className="flex items-center justify-between p-5 pb-3">
              <SectionHeader title="Últimas movimentações" />
              <button type="button" onClick={() => navigate("movimentacoes")} className="text-xs font-semibold text-inv hover:underline">
                ver extrato
              </button>
            </div>
            {model.recent.length === 0 ? (
              <EmptyState compact icon={<IconSwap size={18} />} title="Nada por aqui" description="Adicione sua primeira movimentação." action={<Button size="sm" onClick={() => openTransactionModal()}>Adicionar</Button>} />
            ) : (
              <ul className="divide-y divide-line">
                {model.recent.map((tx) => {
                  const meta = KIND_META[tx.kind];
                  const sign = tx.kind === "despesa" || tx.kind === "taxa" || tx.kind === "aporte" ? -1 : 1;
                  return (
                    <li key={tx.id} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="h-7 w-1 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">{tx.description}</span>
                        <span className="text-[11px] text-mut">
                          {formatDayMonth(tx.date)} · {categoryPath(tx.subcategoryId ?? tx.categoryId)}
                        </span>
                      </span>
                      <span className={`tnum shrink-0 text-[13px] font-bold ${sign > 0 ? "text-up" : "text-down"}`}>
                        {formatSignedBRL(tx.amount * sign)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        <Card className="anim-rise overflow-hidden" hover>
          <div style={{ animationDelay: "260ms" }}>
            <div className="flex items-center justify-between p-5 pb-3">
              <SectionHeader title="Próximos 7 dias" subtitle="Parcelas e compromissos" />
              <button type="button" onClick={() => navigate("recorrencias")} className="text-xs font-semibold text-inv hover:underline">
                recorrências
              </button>
            </div>
            {model.upcoming.length === 0 ? (
              <EmptyState compact icon={<IconCalendar size={18} />} title="Semana tranquila" description="Nenhum vencimento nos próximos 7 dias." />
            ) : (
              <ul className="divide-y divide-line">
                {model.upcoming.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="flex h-9 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-down/10 text-down">
                      <span className="tnum text-[13px] font-bold leading-none">{item.date.slice(8, 10)}</span>
                      <span className="text-[9px] font-semibold uppercase">{formatDayMonth(item.date).split(" ")[1]}</span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{item.label}</span>
                    <span className="tnum shrink-0 text-[13px] font-bold text-down">{formatBRL(item.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="anim-rise overflow-hidden" hover>
          <div style={{ animationDelay: "300ms" }}>
            <div className="flex items-center justify-between p-5 pb-3">
              <SectionHeader title="Metas" subtitle="Você está no caminho?" />
              <button type="button" onClick={() => navigate("metas")} className="text-xs font-semibold text-inv hover:underline">
                todas
              </button>
            </div>
            {goals.length === 0 ? (
              <EmptyState compact icon={<IconTarget size={18} />} title="Nenhuma meta" description="Crie objetivos com prazo e valor." />
            ) : (
              <ul className="space-y-3.5 px-5 pb-5">
                {goals.slice(0, 4).map((goal) => {
                  const pct = goal.targetAmount > 0 ? clamp(goal.currentAmount / goal.targetAmount, 0, 1) : 0;
                  return (
                    <li key={goal.id}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="truncate font-semibold text-ink">{goal.name}</span>
                        <span className="tnum shrink-0 font-bold text-mut">{Math.round(pct * 100)}%</span>
                      </div>
                      <ProgressBar value={pct} color="var(--up)" thickness="h-1.5" />
                    </li>
                  );
                })}
                {model.budgetsOver.length > 0 ? (
                  <li className="rounded-lg border border-down/30 bg-down/5 px-3 py-2 text-[11px] font-medium text-down">
                    {model.budgetsOver.length} orçamento(s) estourado(s): {model.budgetsOver.map((b) => b.label).join(", ")}.
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <p className="pb-2 text-center text-[11px] text-mut">
        {recurrences.filter((r) => r.active).length} recorrências ativas · dados salvos neste navegador ·
        resultado do mês atual {formatSignedBRL(model.resultadoMes)} vs {formatSignedBRL(model.resultadoYearAgo)} no mesmo mês do ano passado
      </p>
    </div>
  );
}
