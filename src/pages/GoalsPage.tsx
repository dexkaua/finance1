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
import { IconCalendar, IconCheck, IconPencil, IconPlus, IconTarget, IconTrash } from "../components/ui/icons";

export function GoalsPage() {
  const { status, goals, deleteGoal, refresh } = useFinance();
  const { push } = useToast();
  const [modal, setModal] = useState<{ open: boolean; editing: Goal | null }>({
    open: false,
    editing: null,
  });
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);

  const totals = useMemo(() => {
    const target = goals.reduce((acc, g) => acc + g.targetAmount, 0);
    const current = goals.reduce((acc, g) => acc + g.currentAmount, 0);
    return { target, current, pct: target > 0 ? current / target : 0 };
  }, [goals]);

  const sorted = useMemo(
    () => [...goals].sort((a, b) => (a.deadline < b.deadline ? -1 : 1)),
    [goals],
  );

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  return (
    <div>
      <PageHeader title="Metas" subtitle="Objetivos financeiros com prazo e progresso">
        <Button size="sm" icon={<IconPlus size={15} />} onClick={() => setModal({ open: true, editing: null })}>
          Nova meta
        </Button>
      </PageHeader>

      {status === "loading" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card className="anim-rise">
          <EmptyState
            icon={<IconTarget size={22} />}
            title="Nenhuma meta criada"
            description="Defina objetivos com valor e prazo para acompanhar seu progresso."
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
              <p className="tnum font-display text-2xl font-bold text-up">
                {Math.round(clamp(totals.pct, 0, 1) * 100)}%
              </p>
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
              return (
                <Card key={goal.id} hover className="anim-rise relative overflow-hidden p-5">
                  <div style={{ animationDelay: `${80 + index * 60}ms` }}>
                    <span
                      className="absolute inset-x-0 top-0 h-1"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-bold text-ink">{goal.name}</h3>
                          {done ? (
                            <Badge tone="up">
                              <IconCheck size={11} /> Concluída
                            </Badge>
                          ) : late ? (
                            <Badge tone="down">Prazo vencido</Badge>
                          ) : null}
                        </div>
                        {goal.purpose ? (
                          <p className="mt-0.5 truncate text-[13px] text-mut">{goal.purpose}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconButton
                          label={`Editar ${goal.name}`}
                          size="sm"
                          onClick={() => setModal({ open: true, editing: goal })}
                        >
                          <IconPencil size={15} />
                        </IconButton>
                        <IconButton
                          label={`Excluir ${goal.name}`}
                          size="sm"
                          tone="danger"
                          onClick={() => setPendingDelete(goal)}
                        >
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
                        {formatBRL(goal.currentAmount)}{" "}
                        <span className="font-medium">/ {formatBRL(goal.targetAmount)}</span>
                      </p>
                    </div>
                    <ProgressBar value={pct} color={color} className="mt-2.5" />

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line pt-3 text-xs text-mut">
                      <span className="flex items-center gap-1.5 font-medium">
                        <IconCalendar size={14} />
                        {formatDateBR(goal.deadline)}
                        {!done ? (
                          <Badge tone={late ? "down" : "neutral"}>
                            {late ? `${Math.abs(days)}d de atraso` : `${days}d restantes`}
                          </Badge>
                        ) : null}
                      </span>
                      {!done ? (
                        <span className="tnum font-medium">
                          Aportar <strong className="text-ink">{formatBRL(monthly)}/mês</strong> para
                          chegar lá
                        </span>
                      ) : (
                        <span className="font-semibold text-up">Objetivo alcançado 🎉</span>
                      )}
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
            deleteGoal(pendingDelete.id);
            push("success", "Meta excluída", pendingDelete.name);
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
