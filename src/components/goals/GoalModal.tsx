import { useEffect, useState } from "react";
import type { Goal, GoalColor, GoalMode, GoalPriority } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import { useToast } from "../../contexts/ToastContext";
import { GOAL_COLORS } from "../../data/categories";
import { monthsUntil } from "../../utils/date";
import { formatBRL, parseCurrencyInput } from "../../utils/format";
import { validateGoal, type FieldErrors } from "../../utils/validation";
import { Button } from "../ui/Button";
import { CurrencyInput, Field, Segmented, SelectInput, TextInput } from "../ui/FormControls";
import { Modal } from "../ui/Modal";
import { IconCheck } from "../ui/icons";

interface FormState {
  name: string;
  purpose: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  color: GoalColor;
  priority: GoalPriority;
  mode: GoalMode;
  monthlyContribution: string;
  accountId: string;
  investmentId: string;
}

function initialState(editing: Goal | null): FormState {
  if (editing) {
    return {
      name: editing.name,
      purpose: editing.purpose,
      targetAmount: editing.targetAmount.toFixed(2).replace(".", ","),
      currentAmount: editing.currentAmount.toFixed(2).replace(".", ","),
      deadline: editing.deadline,
      color: editing.color,
      priority: editing.priority,
      mode: editing.mode,
      monthlyContribution:
        editing.monthlyContribution !== undefined
          ? editing.monthlyContribution.toFixed(2).replace(".", ",")
          : "",
      accountId: editing.accountId ?? "",
      investmentId: editing.investmentId ?? "",
    };
  }
  return {
    name: "",
    purpose: "",
    targetAmount: "",
    currentAmount: "0",
    deadline: "",
    color: "pine",
    priority: "media",
    mode: "prazo",
    monthlyContribution: "",
    accountId: "",
    investmentId: "",
  };
}

export function GoalModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Goal | null;
  onClose: () => void;
}) {
  const { addGoal, updateGoal, accounts, investments } = useFinance();
  const { push } = useToast();
  const [form, setForm] = useState<FormState>(() => initialState(null));
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (open) {
      setForm(initialState(editing));
      setErrors({});
    }
  }, [open, editing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = () => {
    const validation = validateGoal(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    const target = Math.round((parseCurrencyInput(form.targetAmount) ?? 0) * 100) / 100;
    const current = Math.round((parseCurrencyInput(form.currentAmount) ?? 0) * 100) / 100;
    const input = {
      name: form.name.trim(),
      purpose: form.purpose.trim(),
      targetAmount: target,
      currentAmount: current,
      deadline: form.deadline,
      color: form.color,
      priority: form.priority,
      mode: form.mode,
      monthlyContribution:
        form.mode === "aporte"
          ? Math.round((parseCurrencyInput(form.monthlyContribution) ?? 0) * 100) / 100
          : undefined,
      accountId: form.accountId || undefined,
      investmentId: form.investmentId || undefined,
    };
    if (editing) {
      updateGoal(editing.id, input);
      push("success", "Meta atualizada", input.name);
    } else {
      addGoal(input);
      push("success", "Meta criada", input.name);
    }
    onClose();
  };

  // Projeção no modo prazo: quanto aportar por mês para chegar lá
  const projection = (() => {
    const target = parseCurrencyInput(form.targetAmount) ?? 0;
    const current = parseCurrencyInput(form.currentAmount) ?? 0;
    if (!form.deadline || target <= 0) return null;
    const months = monthsUntil(form.deadline);
    if (form.mode === "aporte") {
      const monthly = parseCurrencyInput(form.monthlyContribution) ?? 0;
      const projected = current + monthly * months;
      return projected >= target
        ? `No ritmo atual você atinge a meta em ~${Math.ceil((target - current) / Math.max(1, monthly))} meses.`
        : `Projeção em ${months} meses: ${formatBRL(projected)} — faltariam ${formatBRL(target - projected)}.`;
    }
    const remaining = Math.max(0, target - current);
    return `Para atingir em ${months} meses: aportar ${formatBRL(remaining / months)}/mês.`;
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar meta" : "Nova meta"}
      subtitle="Objetivo, valor, prazo e projeção."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="goal-form">
            {editing ? "Salvar alterações" : "Criar meta"}
          </Button>
        </>
      }
    >
      <form
        id="goal-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
          <Field id="goal-name" label="Nome da meta" error={errors.name}>
            <TextInput
              id="goal-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex.: Reserva de emergência"
              invalid={Boolean(errors.name)}
              maxLength={60}
            />
          </Field>
          <Field id="goal-priority" label="Prioridade">
            <SelectInput
              id="goal-priority"
              value={form.priority}
              onChange={(e) => set("priority", e.target.value as GoalPriority)}
            >
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </SelectInput>
          </Field>
        </div>

        <Field id="goal-purpose" label="Finalidade (opcional)">
          <TextInput
            id="goal-purpose"
            value={form.purpose}
            onChange={(e) => set("purpose", e.target.value)}
            placeholder="Ex.: 6 meses de despesas essenciais"
            maxLength={80}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="goal-target" label="Valor objetivo" error={errors.targetAmount}>
            <CurrencyInput
              id="goal-target"
              value={form.targetAmount}
              onValueChange={(value) => set("targetAmount", value)}
              invalid={Boolean(errors.targetAmount)}
            />
          </Field>
          <Field id="goal-current" label="Valor acumulado" error={errors.currentAmount}>
            <CurrencyInput
              id="goal-current"
              value={form.currentAmount}
              onValueChange={(value) => set("currentAmount", value)}
              invalid={Boolean(errors.currentAmount)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field id="goal-deadline" label="Prazo" error={errors.deadline}>
            <TextInput
              id="goal-deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => set("deadline", e.target.value)}
              invalid={Boolean(errors.deadline)}
            />
          </Field>
          <Field id="goal-mode" label="Modo de planejamento">
            <Segmented
              ariaLabel="Modo da meta"
              value={form.mode}
              onChange={(value) => set("mode", value)}
              options={[
                { value: "prazo", label: "Por prazo" },
                { value: "aporte", label: "Por aporte" },
              ]}
            />
          </Field>
        </div>

        {form.mode === "aporte" ? (
          <Field
            id="goal-monthly"
            label="Aporte mensal planejado"
            error={errors.monthlyContribution}
            hint={projection ?? undefined}
          >
            <CurrencyInput
              id="goal-monthly"
              value={form.monthlyContribution}
              onValueChange={(value) => set("monthlyContribution", value)}
              invalid={Boolean(errors.monthlyContribution)}
            />
          </Field>
        ) : (
          projection ? (
            <p className="anim-fadein rounded-lg border border-inv/25 bg-inv/5 px-3 py-2 text-xs font-medium text-inv">
              {projection}
            </p>
          ) : null
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field id="goal-account" label="Conta vinculada (opcional)">
            <SelectInput id="goal-account" value={form.accountId} onChange={(e) => set("accountId", e.target.value)}>
              <option value="">Nenhuma</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.institution}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id="goal-investment" label="Investimento vinculado (opcional)">
            <SelectInput id="goal-investment" value={form.investmentId} onChange={(e) => set("investmentId", e.target.value)}>
              <option value="">Nenhum</option>
              {investments.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <Field id="goal-color" label="Cor">
          <div className="flex items-center gap-2.5" role="radiogroup" aria-label="Cor da meta">
            {GOAL_COLORS.map((option) => {
              const selected = form.color === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => set("color", option.value)}
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-150",
                    selected ? "scale-110 border-ink/60" : "border-transparent hover:scale-105",
                  ].join(" ")}
                  style={{ backgroundColor: option.hex }}
                >
                  {selected ? <IconCheck size={16} className="text-paper" /> : null}
                </button>
              );
            })}
          </div>
        </Field>
      </form>
    </Modal>
  );
}
