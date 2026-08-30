import { useEffect, useState } from "react";
import type { Investment, InvestmentType } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import { useToast } from "../../contexts/ToastContext";
import { INVESTMENT_TYPES } from "../../data/categories";
import { todayISO } from "../../utils/date";
import { formatBRL, parseCurrencyInput } from "../../utils/format";
import { validateInvestment, type FieldErrors } from "../../utils/validation";
import { Button } from "../ui/Button";
import { CurrencyInput, Field, SelectInput, TextInput } from "../ui/FormControls";
import { Modal } from "../ui/Modal";

interface FormState {
  name: string;
  type: InvestmentType | "";
  institution: string;
  investedAmount: string;
  currentValue: string;
  annualRate: string;
  startDate: string;
}

function initialState(editing: Investment | null): FormState {
  if (editing) {
    return {
      name: editing.name,
      type: editing.type,
      institution: editing.institution,
      investedAmount: editing.investedAmount.toFixed(2).replace(".", ","),
      currentValue: editing.currentValue.toFixed(2).replace(".", ","),
      annualRate: editing.annualRate === null ? "" : String(editing.annualRate).replace(".", ","),
      startDate: editing.startDate,
    };
  }
  return {
    name: "",
    type: "",
    institution: "",
    investedAmount: "",
    currentValue: "",
    annualRate: "",
    startDate: todayISO(),
  };
}

export function InvestmentModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Investment | null;
  onClose: () => void;
}) {
  const { addInvestment, updateInvestment } = useFinance();
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
    const validation = validateInvestment(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    const invested = Math.round((parseCurrencyInput(form.investedAmount) ?? 0) * 100) / 100;
    const current = Math.round((parseCurrencyInput(form.currentValue) ?? 0) * 100) / 100;
    const rateText = form.annualRate.trim().replace(",", ".");
    const input = {
      name: form.name.trim(),
      type: form.type as InvestmentType,
      institution: form.institution.trim(),
      investedAmount: invested,
      currentValue: current,
      annualRate: rateText === "" ? null : Number(rateText),
      startDate: form.startDate,
    };
    if (editing) {
      updateInvestment(editing.id, input);
      push("success", "Investimento atualizado", `${input.name} · ${formatBRL(current)}`);
    } else {
      addInvestment(input);
      push("success", "Investimento cadastrado", `${input.name} · ${formatBRL(invested)}`);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar investimento" : "Novo investimento"}
      subtitle="Registre posição, instituição e rentabilidade."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="investment-form">
            {editing ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </>
      }
    >
      <form
        id="investment-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field id="inv-name" label="Nome" error={errors.name}>
            <TextInput
              id="inv-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex.: Tesouro Selic 2029"
              invalid={Boolean(errors.name)}
              maxLength={60}
            />
          </Field>
          <Field id="inv-type" label="Tipo" error={errors.type}>
            <SelectInput
              id="inv-type"
              value={form.type}
              onChange={(e) => set("type", e.target.value as InvestmentType)}
              invalid={Boolean(errors.type)}
            >
              <option value="">Selecione…</option>
              {INVESTMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <Field id="inv-institution" label="Instituição" error={errors.institution}>
          <TextInput
            id="inv-institution"
            value={form.institution}
            onChange={(e) => set("institution", e.target.value)}
            placeholder="Ex.: XP, Rico, Itaú…"
            invalid={Boolean(errors.institution)}
            maxLength={60}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="inv-invested" label="Valor investido" error={errors.investedAmount}>
            <CurrencyInput
              id="inv-invested"
              value={form.investedAmount}
              onValueChange={(value) => set("investedAmount", value)}
              invalid={Boolean(errors.investedAmount)}
            />
          </Field>
          <Field id="inv-current" label="Valor atual" error={errors.currentValue}>
            <CurrencyInput
              id="inv-current"
              value={form.currentValue}
              onValueChange={(value) => set("currentValue", value)}
              invalid={Boolean(errors.currentValue)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            id="inv-rate"
            label="Rentabilidade (% a.a.)"
            error={errors.annualRate}
            hint="Deixe vazio se for renda variável."
          >
            <TextInput
              id="inv-rate"
              inputMode="decimal"
              value={form.annualRate}
              onChange={(e) => set("annualRate", e.target.value)}
              placeholder="Ex.: 11,5"
              invalid={Boolean(errors.annualRate)}
            />
          </Field>
          <Field id="inv-start" label="Data de início" error={errors.startDate}>
            <TextInput
              id="inv-start"
              type="date"
              value={form.startDate}
              max={todayISO()}
              onChange={(e) => set("startDate", e.target.value)}
              invalid={Boolean(errors.startDate)}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
