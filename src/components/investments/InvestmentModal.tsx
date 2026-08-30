import { useEffect, useMemo, useState } from "react";
import type { Investment, InvestmentType, YieldMode } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import { useToast } from "../../contexts/ToastContext";
import { INVESTMENT_TYPES, YIELD_MODES, investmentTypeMeta } from "../../data/categories";
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
  broker: string;
  investedAmount: string;
  currentValue: string;
  quantity: string;
  avgPrice: string;
  currentPrice: string;
  fees: string;
  taxes: string;
  yieldMode: YieldMode;
  yieldRate: string;
  startDate: string;
  maturityDate: string;
  note: string;
}

const numToStr = (value: number | null): string =>
  value === null ? "" : String(value).replace(".", ",");

function initialState(editing: Investment | null): FormState {
  if (editing) {
    return {
      name: editing.name,
      type: editing.type,
      institution: editing.institution,
      broker: editing.broker ?? "",
      investedAmount: editing.investedAmount.toFixed(2).replace(".", ","),
      currentValue: editing.currentValue.toFixed(2).replace(".", ","),
      quantity: numToStr(editing.quantity),
      avgPrice: numToStr(editing.avgPrice),
      currentPrice: numToStr(editing.currentPrice),
      fees: editing.fees > 0 ? String(editing.fees).replace(".", ",") : "",
      taxes: editing.taxes > 0 ? String(editing.taxes).replace(".", ",") : "",
      yieldMode: editing.yield.mode,
      yieldRate: editing.yield.rate > 0 ? String(editing.yield.rate).replace(".", ",") : "",
      startDate: editing.startDate,
      maturityDate: editing.maturityDate ?? "",
      note: editing.note ?? "",
    };
  }
  return {
    name: "",
    type: "",
    institution: "",
    broker: "",
    investedAmount: "",
    currentValue: "",
    quantity: "",
    avgPrice: "",
    currentPrice: "",
    fees: "",
    taxes: "",
    yieldMode: "manual",
    yieldRate: "",
    startDate: todayISO(),
    maturityDate: "",
    note: "",
  };
}

const parseNum = (raw: string): number | null => {
  if (raw.trim() === "") return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function InvestmentModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Investment | null;
  onClose: () => void;
}) {
  const { addInvestment, updateInvestment, settings } = useFinance();
  const { push } = useToast();
  const [form, setForm] = useState<FormState>(() => initialState(null));
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (open) {
      setForm(initialState(editing));
      setErrors({});
    }
  }, [open, editing]);

  const fixedIncome = useMemo(() => {
    if (!form.type) return false;
    return investmentTypeMeta(form.type as InvestmentType).fixedIncome;
  }, [form.type]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const yieldHint = useMemo(() => {
    const rate = Number(form.yieldRate.replace(",", "."));
    if (!Number.isFinite(rate) || form.yieldMode === "manual") return null;
    const invested = parseCurrencyInput(form.investedAmount) ?? 0;
    if (invested <= 0) return null;
    let annualPct = 0;
    if (form.yieldMode === "fixa") annualPct = rate;
    else if (form.yieldMode === "cdi") annualPct = (rate / 100) * settings.benchmarks.cdi;
    else if (form.yieldMode === "selic") annualPct = (rate / 100) * settings.benchmarks.selic;
    else if (form.yieldMode === "ipca") annualPct = (1 + settings.benchmarks.ipca / 100) * (1 + rate / 100) * 100 - 100;
    const monthly = Math.pow(1 + annualPct / 100, 1 / 12) - 1;
    return `Projeção bruta (juros compostos, índices configurados): ${formatBRL(invested * monthly)}/mês · ${annualPct.toFixed(2)}% a.a.`;
  }, [form.yieldMode, form.yieldRate, form.investedAmount, settings.benchmarks]);

  const handleSubmit = () => {
    const validation = validateInvestment(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    const input = {
      name: form.name.trim(),
      type: form.type as InvestmentType,
      institution: form.institution.trim(),
      broker: form.broker.trim() || undefined,
      investedAmount: Math.round((parseCurrencyInput(form.investedAmount) ?? 0) * 100) / 100,
      currentValue: Math.round((parseCurrencyInput(form.currentValue) ?? 0) * 100) / 100,
      quantity: parseNum(form.quantity),
      avgPrice: parseNum(form.avgPrice),
      currentPrice: parseNum(form.currentPrice),
      fees: parseNum(form.fees) ?? 0,
      taxes: parseNum(form.taxes) ?? 0,
      startDate: form.startDate,
      maturityDate: form.maturityDate || null,
      yield: {
        mode: form.yieldMode,
        rate: form.yieldMode === "manual" ? 0 : Number(form.yieldRate.replace(",", ".")) || 0,
      },
      note: form.note.trim() || undefined,
    };
    if (editing) {
      updateInvestment(editing.id, input);
      push("success", "Investimento atualizado", input.name);
    } else {
      addInvestment(input);
      push("success", "Investimento cadastrado", `${input.name} · ${formatBRL(input.investedAmount)}`);
    }
    onClose();
  };

  const modeMeta = YIELD_MODES.find((m) => m.value === form.yieldMode);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar investimento" : "Novo investimento"}
      subtitle="Posição, instituição, rentabilidade e custos."
      size="lg"
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
          <Field id="inv-name" label="Nome do ativo" error={errors.name}>
            <TextInput
              id="inv-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex.: Tesouro Selic 2029, PETR4, CDB…"
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

        <div className="grid grid-cols-2 gap-3">
          <Field id="inv-institution" label="Instituição" error={errors.institution}>
            <TextInput
              id="inv-institution"
              value={form.institution}
              onChange={(e) => set("institution", e.target.value)}
              placeholder="Ex.: Tesouro Direto, Petrobras…"
              invalid={Boolean(errors.institution)}
              maxLength={60}
            />
          </Field>
          <Field id="inv-broker" label="Corretora (opcional)">
            <TextInput
              id="inv-broker"
              value={form.broker}
              onChange={(e) => set("broker", e.target.value)}
              placeholder="Ex.: XP, Rico, NuInvest"
              maxLength={60}
            />
          </Field>
        </div>

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

        <div className="grid grid-cols-3 gap-3">
          <Field id="inv-qty" label="Quantidade" error={errors.quantity}>
            <TextInput
              id="inv-qty"
              inputMode="decimal"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              placeholder="Ex.: 120"
              invalid={Boolean(errors.quantity)}
            />
          </Field>
          <Field id="inv-avg" label="Preço médio" error={errors.avgPrice}>
            <TextInput
              id="inv-avg"
              inputMode="decimal"
              value={form.avgPrice}
              onChange={(e) => set("avgPrice", e.target.value)}
              placeholder="Ex.: 28,50"
              invalid={Boolean(errors.avgPrice)}
            />
          </Field>
          <Field id="inv-price" label="Preço atual" error={errors.currentPrice}>
            <TextInput
              id="inv-price"
              inputMode="decimal"
              value={form.currentPrice}
              onChange={(e) => set("currentPrice", e.target.value)}
              placeholder="Ex.: 34,20"
              invalid={Boolean(errors.currentPrice)}
            />
          </Field>
        </div>

        <div className="rounded-xl border border-line bg-card2/60 p-3.5">
          <p className="text-[13px] font-bold text-ink">Rentabilidade {fixedIncome ? "(renda fixa)" : ""}</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_1fr]">
            <Field id="inv-yield-mode" label="Modelo">
              <SelectInput
                id="inv-yield-mode"
                value={form.yieldMode}
                onChange={(e) => set("yieldMode", e.target.value as YieldMode)}
              >
                {YIELD_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field
              id="inv-yield-rate"
              label={
                form.yieldMode === "cdi" || form.yieldMode === "selic"
                  ? "% do indexador"
                  : form.yieldMode === "ipca"
                    ? "Taxa real (% a.a.)"
                    : "Taxa (% a.a.)"
              }
              error={errors.yieldRate}
              hint={form.yieldMode === "manual" ? "Acompanhar apenas os valores informados." : modeMeta?.hint}
            >
              <TextInput
                id="inv-yield-rate"
                inputMode="decimal"
                value={form.yieldRate}
                onChange={(e) => set("yieldRate", e.target.value)}
                placeholder={form.yieldMode === "cdi" ? "Ex.: 110" : form.yieldMode === "ipca" ? "Ex.: 6,1" : "Ex.: 12"}
                invalid={Boolean(errors.yieldRate)}
                disabled={form.yieldMode === "manual"}
              />
            </Field>
          </div>
          {yieldHint ? <p className="anim-fadein mt-2 text-xs font-medium text-inv">{yieldHint}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field id="inv-fees" label="Taxas" error={errors.fees}>
            <TextInput id="inv-fees" inputMode="decimal" value={form.fees} onChange={(e) => set("fees", e.target.value)} placeholder="0,00" invalid={Boolean(errors.fees)} />
          </Field>
          <Field id="inv-taxes" label="Impostos" error={errors.taxes}>
            <TextInput id="inv-taxes" inputMode="decimal" value={form.taxes} onChange={(e) => set("taxes", e.target.value)} placeholder="0,00" invalid={Boolean(errors.taxes)} />
          </Field>
          <Field id="inv-start" label="Data de compra" error={errors.startDate}>
            <TextInput id="inv-start" type="date" value={form.startDate} max={todayISO()} onChange={(e) => set("startDate", e.target.value)} invalid={Boolean(errors.startDate)} />
          </Field>
          <Field id="inv-maturity" label="Vencimento" error={errors.maturityDate}>
            <TextInput id="inv-maturity" type="date" value={form.maturityDate} onChange={(e) => set("maturityDate", e.target.value)} invalid={Boolean(errors.maturityDate)} />
          </Field>
        </div>

        <Field id="inv-note" label="Observações (opcional)">
          <TextInput
            id="inv-note"
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Ex.: isento de IR, carência até…"
            maxLength={140}
          />
        </Field>
      </form>
    </Modal>
  );
}
