import { useMemo, useState } from "react";
import type { Goal } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { goalColorHex } from "../data/categories";
import { daysUntil, formatDateBR, monthsUntil } from "../utils/date";
import { clamp, formatBRL } from "../utils/format";
import { Badge, Card, PageHeader, ProgressBar } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/Modal";
import { GoalModal } from "../components/goals/GoalModal";
import { IconCalendar, IconCheck, IconPencil, IconPlus, IconTarget, IconTrash, IconTrendUp } from "../components/ui/icons";

const PRIORITY_LABEL: Record<Goal["priority"], string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

export function GoalsPage() {
  const { status, goals, accounts, investments, removeGoal, refresh } = useFinance();
  const { push } = useToast();
  const [modal, setModal] = useState<{ open: boolean; editing: Goal | null }>({ open: false, editing: null });
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);

  const totals = useMemo(() => {
    const target = goals.reduce((acc, g) => acc + g.targetAmount, 0);
    const current = goals.reduce((acc, g) => acc + g.currentAmount, 0);
    return { target, current, pct: target > 0 ? current / target : 0 };
  }, [goals]);

  const sorted = useMemo(
    () =>
      [...goals].sort((a, b) => {
        const order = { alta: 0, media: 1, baixa: 2 } as const;
        if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
        return a.deadline < b.deadline ? -1 : 1;
      }),
    [goals],
  );

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  return (
    <div>
      <PageHeader title="Metas" subtitle="Objetivos com prazo, prioridade, projeção e vínculos">
        <Button size="sm" icon={<IconPlus size={15} />} onClick={() => setModal({ open: true, editing: null })}>
          Nova meta
        </Button>
      </PageHeader>

      {status === "loading" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card className="anim-rise">
          <EmptyState
            icon={<IconTarget size={22} />}
            title="Nenhuma meta criada"
            description="Defina objetivos com valor, prazo e prioridade — por prazo ou por aporte mensal."
            action={
              <Button icon={<IconPlus size={16} />} onClick={() => setModal({ open: true, editing: null })}>
                Criar primeira meta
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="anim-rise p-5" hover>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-mut">Progresso consolidado</p>
                <p className="tnum mt-1 font-display text-xl font-bold text-ink">
                  {formatBRL(totals.current)}{" "}
                  <span className="text-sm font-semibold text-mut">de {formatBRL(totals.target)}</span>
                </p>
              </div>
              <p className="tnum font-display text-2xl font-bold text-up">{Math.round(clamp(totals.pct, 0, 1) * 100)}%</p>
            </div>
            <ProgressBar value={totals.pct} color="var(--up)" className="mt-3" />
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {sorted.map((goal, index) => {
              const pct = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
              const done = pct >= 1;
              const days = daysUntil(goal.deadline);
              const late = !done && days < 0;
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
              const monthly = remaining / monthsUntil(goal.deadline);
              const color = goalColorHex(goal.color);
              const linkedAccount = accounts.find((a) => a.id === goal.accountId);
              const linkedInvestment = investments.find((i) => i.id === goal.investmentId);
              const projection =
                goal.mode === "aporte" && goal.monthlyContribution
                  ? goal.currentAmount + goal.monthlyContribution * monthsUntil(goal.deadline)
                  : null;
              return (
                <Card key={goal.id} hover className="anim-rise relative overflow-hidden p-5">
                  <div style={{ animationDelay: `${80 + index * 60}ms` }}>
                    <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} aria-hidden="true" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-bold text-ink">{goal.name}</h3>
                          {done ? (
                            <Badge tone="up"><IconCheck size={11} /> Concluída</Badge>
                          ) : late ? (
                            <Badge tone="down">Prazo vencido</Badge>
                          ) : null}
                          <Badge tone={goal.priority === "alta" ? "down" : goal.priority === "media" ? "gold" : "neutral"}>
                            {PRIORITY_LABEL[goal.priority]}
                          </Badge>
                        </div>
                        {goal.purpose ? <p className="mt-0.5 truncate text-[13px] text-mut">{goal.purpose}</p> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconButton label={`Editar ${goal.name}`} size="sm" onClick={() => setModal({ open: true, editing: goal })}>
                          <IconPencil size={15} />
                        </IconButton>
                        <IconButton label={`Excluir ${goal.name}`} size="sm" tone="danger" onClick={() => setPendingDelete(goal)}>
                          <IconTrash size={15} />
                        </IconButton>
                      </div>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <p className="tnum font-display text-[26px] font-bold leading-none text-ink">
                        {Math.round(clamp(pct, 0, 1) * 100)}
                        <span className="text-base text-mut">%</span>
                      </p>
                      <p className="tnum text-[13px] font-semibold text-mut">
                        {formatBRL(goal.currentAmount)} <span className="font-medium">/ {formatBRL(goal.targetAmount)}</span>
                      </p>
                    </div>
                    <ProgressBar value={pct} color={color} className="mt-2.5" />

                    <div className="mt-4 space-y-1.5 border-t border-dashed border-line pt-3 text-xs text-mut">
                      <p className="flex flex-wrap items-center gap-1.5 font-medium">
                        <IconCalendar size={14} />
                        {formatDateBR(goal.deadline)}
                        {!done ? (
                          <Badge tone={late ? "down" : "neutral"}>
                            {late ? `${Math.abs(days)}d de atraso` : `${days}d restantes`}
                          </Badge>
                        ) : null}
                      </p>
                      {!done ? (
                        goal.mode === "aporte" && goal.monthlyContribution ? (
                          <p className="tnum font-medium">
                            Aportando <strong className="text-ink">{formatBRL(goal.monthlyContribution)}/mês</strong>
                            {projection !== null ? (
                              <> → projeção de <strong className={projection >= goal.targetAmount ? "text-up" : "text-down"}>{formatBRL(projection)}</strong> no prazo</>
                            ) : null}
                          </p>
                        ) : (
                          <p className="tnum font-medium">
                            Aportar <strong className="text-ink">{formatBRL(monthly)}/mês</strong> para chegar lá
                          </p>
                        )
                      ) : (
                        <p className="font-semibold text-up">Objetivo alcançado 🎉</p>
                      )}
                      {linkedAccount || linkedInvestment ? (
                        <p className="flex flex-wrap items-center gap-1.5">
                          <IconTrendUp size={13} />
                          Vinculada a{" "}
                          <strong className="text-ink">
                            {linkedInvestment ? linkedInvestment.name : linkedAccount?.institution}
                          </strong>
                          {linkedInvestment
                            ? ` (rentabilidade configurada do ativo vale para projeções futuras)`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <GoalModal open={modal.open} editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir meta"
        message={
          <p>
            Excluir a meta <strong className="text-ink">“{pendingDelete?.name}”</strong> remove o
            acompanhamento de progresso. Essa ação não pode ser desfeita.
          </p>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            removeGoal(pendingDelete.id);
            push("success", "Meta excluída", pendingDelete.name);
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
