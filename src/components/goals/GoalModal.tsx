import { useEffect, useState } from "react";
import type { Goal, GoalColor } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import { useToast } from "../../contexts/ToastContext";
import { GOAL_COLORS } from "../../data/categories";
import { parseCurrencyInput } from "../../utils/format";
import { validateGoal, type FieldErrors } from "../../utils/validation";
import { Button } from "../ui/Button";
import { CurrencyInput, Field, TextInput } from "../ui/FormControls";
import { Modal } from "../ui/Modal";
import { IconCheck } from "../ui/icons";

interface FormState {
  name: string;
  purpose: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  color: GoalColor;
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
    };
  }
  return {
    name: "",
    purpose: "",
    targetAmount: "",
    currentAmount: "0",
    deadline: "",
    color: "pine",
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
  const { addGoal, updateGoal } = useFinance();
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
    const input = {
      name: form.name.trim(),
      purpose: form.purpose.trim(),
      targetAmount: Math.round((parseCurrencyInput(form.targetAmount) ?? 0) * 100) / 100,
      currentAmount: Math.round((parseCurrencyInput(form.currentAmount) ?? 0) * 100) / 100,
      deadline: form.deadline,
      color: form.color,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar meta" : "Nova meta"}
      subtitle="Defina objetivo, valor e prazo."
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

        <Field id="goal-deadline" label="Prazo" error={errors.deadline}>
          <TextInput
            id="goal-deadline"
            type="date"
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
            invalid={Boolean(errors.deadline)}
          />
        </Field>

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
