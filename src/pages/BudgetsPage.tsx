import { useMemo, useState } from "react";
import type { Budget } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { rootCategoriesOf } from "../data/categories";
import { budgetStatuses } from "../utils/finance";
import { formatBRL, formatPercent, parseCurrencyInput } from "../utils/format";
import { validateBudget } from "../utils/validation";
import { Badge, Card, PageHeader, ProgressBar } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { CurrencyInput, Field, SelectInput } from "../components/ui/FormControls";
import { IconCalendar, IconPencil, IconPlus, IconTrash } from "../components/ui/icons";

export function BudgetsPage() {
  const { status, budgets, transactions, addBudget, updateBudget, removeBudget, refresh } = useFinance();
  const { push } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<Budget | null>(null);

  const categories = useMemo(() => rootCategoriesOf("despesa"), []);
  const statuses = useMemo(() => budgetStatuses(budgets, transactions), [budgets, transactions]);

  const totalLimit = statuses.reduce((a, s) => a + s.limit, 0);
  const totalUsed = statuses.reduce((a, s) => a + s.used, 0);

  const handleSubmit = () => {
    const validation = validateBudget({ categoryId, monthlyLimit: limit });
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    const data = { categoryId, monthlyLimit: Math.round((parseCurrencyInput(limit) ?? 0) * 100) / 100 };
    if (editing) {
      updateBudget(editing.id, data);
      push("success", "Orçamento atualizado");
    } else {
      addBudget(data);
      push("success", "Orçamento criado", `${data.monthlyLimit ? formatBRL(data.monthlyLimit) : ""}/mês`);
    }
    setModalOpen(false);
  };

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  return (
    <div>
      <PageHeader title="Orçamentos" subtitle="Limites mensais por categoria com previsão de fechamento">
        <Button size="sm" icon={<IconPlus size={15} />} onClick={() => {
          setEditing(null);
          setCategoryId("");
          setLimit("");
          setErrors({});
          setModalOpen(true);
        }}>
          Novo orçamento
        </Button>
      </PageHeader>

      {status === "loading" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card className="anim-rise">
          <EmptyState
            icon={<IconCalendar size={22} />}
            title="Nenhum orçamento definido"
            description="Ex.: Alimentação R$ 800 — o sistema mostra utilizado, disponível, excedido e previsão de fechamento."
            action={
              <Button icon={<IconPlus size={16} />} onClick={() => { setEditing(null); setCategoryId(""); setLimit(""); setErrors({}); setModalOpen(true); }}>
                Criar orçamento
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="anim-rise flex flex-wrap items-end justify-between gap-2 p-5">
            <div>
              <p className="text-[13px] font-semibold text-mut">Orçado no mês</p>
              <p className="tnum mt-1 font-display text-xl font-bold text-ink">
                {formatBRL(totalUsed)} <span className="text-sm font-semibold text-mut">de {formatBRL(totalLimit)}</span>
              </p>
            </div>
            <p className={`tnum font-display text-xl font-bold ${totalUsed > totalLimit ? "text-down" : "text-up"}`}>
              {formatPercent(totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0, 1)} utilizado
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {statuses.map((s, index) => (
              <Card key={s.budget.id} hover className="anim-rise p-5">
                <div style={{ animationDelay: `${60 + index * 50}ms` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-mut">{s.path}</p>
                    </div>
                    <div className="flex gap-0.5">
                      <IconButton
                        label={`Editar orçamento de ${s.label}`}
                        size="sm"
                        onClick={() => {
                          setEditing(s.budget);
                          setCategoryId(s.budget.categoryId);
                          setLimit(s.budget.monthlyLimit.toFixed(2).replace(".", ","));
                          setErrors({});
                          setModalOpen(true);
                        }}
                      >
                        <IconPencil size={15} />
                      </IconButton>
                      <IconButton label={`Excluir orçamento de ${s.label}`} size="sm" tone="danger" onClick={() => setPendingDelete(s.budget)}>
                        <IconTrash size={15} />
                      </IconButton>
                    </div>
                  </div>

                  <p className="tnum mt-3 text-sm font-semibold text-ink">
                    {formatBRL(s.used)} <span className="font-medium text-mut">/ {formatBRL(s.limit)}</span>
                    <span className={`ml-2 font-bold ${s.exceeded ? "text-down" : "text-up"}`}>
                      {formatPercent(s.pct, 1)}
                    </span>
                  </p>
                  <ProgressBar
                    value={Math.min(1, s.pct / 100)}
                    color={s.exceeded ? "var(--down)" : s.pct > 80 ? "var(--gold)" : s.color}
                    className="mt-2"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {s.exceeded ? (
                      <Badge tone="down">Excedido em {formatBRL(Math.abs(s.available))}</Badge>
                    ) : (
                      <Badge tone="up">Disponível {formatBRL(s.available)}</Badge>
                    )}
                    <span className="tnum text-mut">
                      Previsão de fechamento:{" "}
                      <strong className={s.forecast > s.limit ? "text-down" : "text-ink"}>{formatBRL(s.forecast)}</strong>
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar orçamento" : "Novo orçamento"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editing ? "Salvar" : "Criar"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field id="budget-cat" label="Categoria de despesa" error={errors.categoryId}>
            <SelectInput id="budget-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} invalid={Boolean(errors.categoryId)}>
              <option value="">Selecione…</option>
              {categories
                .filter((c) => editing || !budgets.some((b) => b.categoryId === c.id))
                .map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
            </SelectInput>
          </Field>
          <Field id="budget-limit" label="Limite mensal" error={errors.monthlyLimit}>
            <CurrencyInput id="budget-limit" value={limit} onValueChange={setLimit} invalid={Boolean(errors.monthlyLimit)} placeholder="Ex.: 800,00" />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir orçamento"
        message={<p>Remover o limite mensal desta categoria? O histórico de despesas não é afetado.</p>}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            removeBudget(pendingDelete.id);
            push("success", "Orçamento excluído");
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
