import { useEffect, useMemo, useState } from "react";
import type { PaymentMethod, Transaction, TransactionInput, TxKind } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import { useToast } from "../../contexts/ToastContext";
import {
  KIND_META,
  PAYMENT_METHODS,
  rootCategoriesOf,
  subCategoriesOf,
} from "../../data/categories";
import { todayISO } from "../../utils/date";
import { formatBRL, parseCurrencyInput } from "../../utils/format";
import { validateTransaction, type FieldErrors } from "../../utils/validation";
import { Button } from "../ui/Button";
import { CurrencyInput, Field, Segmented, SelectInput, TextInput } from "../ui/FormControls";
import { Modal } from "../ui/Modal";

interface FormState {
  kind: TxKind;
  description: string;
  amount: string;
  categoryId: string;
  subcategoryId: string;
  date: string;
  paymentMethod: PaymentMethod | "";
  accountId: string;
  toAccountId: string;
  cardId: string;
  useCard: boolean;
  installments: string;
  person: string;
  note: string;
}

const KIND_OPTIONS: TxKind[] = [
  "receita",
  "despesa",
  "transferencia",
  "aporte",
  "resgate",
  "dividendo",
  "juros",
  "taxa",
  "estorno",
  "ajuste",
];

function initialState(
  editing: Transaction | null,
  prefillKind?: TxKind,
  prefillAccountId?: string,
  defaultAccountId?: string,
): FormState {
  if (editing) {
    return {
      kind: editing.kind,
      description: editing.description,
      amount: editing.amount.toFixed(2).replace(".", ","),
      categoryId: editing.categoryId,
      subcategoryId: editing.subcategoryId ?? "",
      date: editing.date,
      paymentMethod: editing.paymentMethod,
      accountId: editing.accountId,
      toAccountId: editing.toAccountId ?? "",
      cardId: editing.cardId ?? "",
      useCard: Boolean(editing.cardId),
      installments: "1",
      person: editing.person ?? "",
      note: editing.note ?? "",
    };
  }
  const kind = prefillKind ?? "despesa";
  return {
    kind,
    description: "",
    amount: "",
    categoryId: "",
    subcategoryId: "",
    date: todayISO(),
    paymentMethod: kind === "despesa" ? "pix" : "transferencia",
    accountId: prefillAccountId ?? defaultAccountId ?? "",
    toAccountId: "",
    cardId: "",
    useCard: false,
    installments: "1",
    person: "",
    note: "",
  };
}

export function TransactionModal() {
  const {
    txModal,
    closeTransactionModal,
    addTransaction,
    updateTransaction,
    createInstallmentPurchase,
    accounts,
    cards,
    investments,
  } = useFinance();
  const { push } = useToast();
  const { open, editing, prefillKind, prefillAccountId } = txModal;

  const [form, setForm] = useState<FormState>(() =>
    initialState(null, undefined, undefined, accounts[0]?.id),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [correctionReason, setCorrectionReason] = useState("");
  const [showReason, setShowReason] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialState(editing, prefillKind, prefillAccountId, accounts[0]?.id));
      setErrors({});
      setCorrectionReason("");
      setShowReason(false);
    }
  }, [open, editing, prefillKind, prefillAccountId, accounts]);

  const kindForCategories: "receita" | "despesa" | "investimento" =
    form.kind === "receita" || form.kind === "dividendo" || form.kind === "juros" || form.kind === "estorno"
      ? "receita"
      : form.kind === "aporte" || form.kind === "resgate"
        ? "investimento"
        : "despesa";

  const rootCats = useMemo(() => rootCategoriesOf(kindForCategories), [kindForCategories]);
  const subCats = useMemo(() => subCategoriesOf(form.categoryId), [form.categoryId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "categoryId") next.subcategoryId = "";
      if (key === "useCard" && value === false) {
        next.cardId = "";
        next.installments = "1";
      }
      return next;
    });
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = () => {
    const validation = validateTransaction(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    const amount = Math.round((parseCurrencyInput(form.amount) ?? 0) * 100) / 100;
    const base: TransactionInput = {
      kind: form.kind,
      description: form.description.trim(),
      amount,
      categoryId: form.categoryId,
      subcategoryId: form.subcategoryId || undefined,
      date: form.date,
      paymentMethod: form.paymentMethod as PaymentMethod,
      accountId: form.accountId,
      toAccountId: form.kind === "transferencia" ? form.toAccountId : undefined,
      cardId: form.kind === "despesa" && form.useCard && form.cardId ? form.cardId : undefined,
      person: form.person.trim() || undefined,
      note: form.note.trim() || undefined,
      direction: form.kind === "ajuste" ? undefined : undefined,
    };

    if (editing) {
      const reason = showReason ? correctionReason.trim() || undefined : undefined;
      updateTransaction(editing.id, base, reason);
      push("success", reason ? "Movimentação corrigida" : "Movimentação atualizada", base.description);
      closeTransactionModal();
      return;
    }

    const installments = Number(form.installments);
    if (form.kind === "despesa" && form.useCard && form.cardId && installments > 1) {
      createInstallmentPurchase(base, installments);
      push(
        "success",
        "Compra parcelada criada",
        `${installments}x de ${formatBRL(amount / installments)} — o fluxo reconhece uma parcela por mês.`,
      );
    } else {
      const created = addTransaction(base);
      const meta = KIND_META[created.kind];
      push("success", `${meta.label} registrada`, `${created.description} · ${formatBRL(created.amount)}`);
    }
    closeTransactionModal();
  };

  const investmentLinked = form.kind === "aporte" || form.kind === "resgate" || form.kind === "dividendo";

  return (
    <Modal
      open={open}
      onClose={closeTransactionModal}
      title={editing ? "Editar movimentação" : "Nova movimentação"}
      subtitle={
        editing
          ? "Alterações ficam registradas no histórico imutável."
          : "Receitas, despesas, transferências, aportes e mais."
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={closeTransactionModal}>
            Cancelar
          </Button>
          <Button type="submit" form="tx-form">
            {editing ? "Salvar alterações" : "Adicionar"}
          </Button>
        </>
      }
    >
      <form
        id="tx-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <Field id="tx-kind" label="Tipo">
          <div className="flex flex-wrap gap-1.5">
            {KIND_OPTIONS.map((kind) => {
              const meta = KIND_META[kind];
              const active = form.kind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set("kind", kind)}
                  className={[
                    "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all duration-150",
                    active
                      ? "border-transparent text-paper shadow-sm"
                      : "border-line bg-card text-mut hover:text-ink hover:border-linestrong",
                  ].join(" ")}
                  style={active ? { backgroundColor: meta.color } : undefined}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
          <Field id="tx-desc" label="Descrição" error={errors.description}>
            <TextInput
              id="tx-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Ex.: Supermercado, Salário, Transferência…"
              invalid={Boolean(errors.description)}
              maxLength={80}
            />
          </Field>
          <Field id="tx-amount" label="Valor" error={errors.amount}>
            <CurrencyInput
              id="tx-amount"
              value={form.amount}
              onValueChange={(value) => set("amount", value)}
              invalid={Boolean(errors.amount)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field id="tx-category" label="Categoria" error={errors.categoryId}>
            <SelectInput
              id="tx-category"
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              invalid={Boolean(errors.categoryId)}
            >
              <option value="">Selecione…</option>
              {rootCats.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id="tx-subcategory" label="Subcategoria (opcional)">
            <SelectInput
              id="tx-subcategory"
              value={form.subcategoryId}
              onChange={(e) => set("subcategoryId", e.target.value)}
              disabled={subCats.length === 0}
            >
              <option value="">{subCats.length === 0 ? "Sem subcategorias" : "Nenhuma"}</option>
              {subCats.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field id="tx-date" label="Data" error={errors.date}>
            <TextInput
              id="tx-date"
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              invalid={Boolean(errors.date)}
            />
          </Field>
          <Field id="tx-payment" label="Forma de pagamento" error={errors.paymentMethod}>
            <SelectInput
              id="tx-payment"
              value={form.paymentMethod}
              onChange={(e) => set("paymentMethod", e.target.value as PaymentMethod)}
              invalid={Boolean(errors.paymentMethod)}
            >
              <option value="">Selecione…</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        {form.kind === "transferencia" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field id="tx-account" label="Conta de origem" error={errors.accountId}>
              <SelectInput
                id="tx-account"
                value={form.accountId}
                onChange={(e) => set("accountId", e.target.value)}
                invalid={Boolean(errors.accountId)}
              >
                <option value="">Selecione…</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.institution}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field id="tx-to-account" label="Conta de destino" error={errors.toAccountId}>
              <SelectInput
                id="tx-to-account"
                value={form.toAccountId}
                onChange={(e) => set("toAccountId", e.target.value)}
                invalid={Boolean(errors.toAccountId)}
              >
                <option value="">Selecione…</option>
                {accounts
                  .filter((account) => account.id !== form.accountId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.institution}
                    </option>
                  ))}
              </SelectInput>
            </Field>
          </div>
        ) : (
          <Field id="tx-account" label="Conta" error={errors.accountId}>
            <SelectInput
              id="tx-account"
              value={form.accountId}
              onChange={(e) => set("accountId", e.target.value)}
              invalid={Boolean(errors.accountId)}
            >
              <option value="">Selecione…</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.institution}
                </option>
              ))}
            </SelectInput>
          </Field>
        )}

        {form.kind === "despesa" ? (
          <div className="rounded-xl border border-dashed border-line bg-card2/60 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-ink">Pagar no cartão de crédito?</p>
                <p className="text-xs text-mut">
                  A compra ocupa o limite e entra na fatura — o saldo da conta só muda no pagamento.
                </p>
              </div>
              <div className="w-24">
                <Segmented
                  ariaLabel="Usar cartão de crédito"
                  value={form.useCard ? "sim" : "nao"}
                  onChange={(value) => set("useCard", value === "sim")}
                  options={[
                    { value: "nao", label: "Não" },
                    { value: "sim", label: "Sim" },
                  ]}
                />
              </div>
            </div>
            {form.useCard ? (
              <div className="anim-fadein mt-3 grid grid-cols-2 gap-3">
                <Field id="tx-card" label="Cartão" error={errors.cardId}>
                  <SelectInput
                    id="tx-card"
                    value={form.cardId}
                    onChange={(e) => set("cardId", e.target.value)}
                    invalid={Boolean(errors.cardId)}
                  >
                    <option value="">Selecione…</option>
                    {cards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field
                  id="tx-installments"
                  label="Parcelas"
                  error={errors.installments}
                  hint={
                    Number(form.installments) > 1 && parseCurrencyInput(form.amount)
                      ? `${form.installments}x de ${formatBRL((parseCurrencyInput(form.amount) ?? 0) / Number(form.installments))}`
                      : "1 = compra à vista na fatura"
                  }
                >
                  <TextInput
                    id="tx-installments"
                    inputMode="numeric"
                    value={form.installments}
                    onChange={(e) => set("installments", e.target.value.replace(/\D/g, ""))}
                    invalid={Boolean(errors.installments)}
                  />
                </Field>
              </div>
            ) : null}
          </div>
        ) : null}

        {investmentLinked ? (
          <Field id="tx-investment" label="Investimento vinculado (opcional)">
            <SelectInput
              id="tx-investment"
              value={form.kind === "aporte" ? form.note : ""}
              onChange={() => undefined}
              disabled
            >
              <option value="">Registro manual — informe na página Investimentos</option>
            </SelectInput>
          </Field>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="tx-person" label="Pessoa (opcional)">
            <TextInput
              id="tx-person"
              value={form.person}
              onChange={(e) => set("person", e.target.value)}
              placeholder="Ex.: Cliente João"
              maxLength={60}
            />
          </Field>
          <Field id="tx-note" label="Observação (opcional)">
            <TextInput
              id="tx-note"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Detalhes, referência…"
              maxLength={120}
            />
          </Field>
        </div>

        {editing ? (
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink">
              <input
                type="checkbox"
                checked={showReason}
                onChange={(e) => setShowReason(e.target.checked)}
                className="h-4 w-4 accent-[#9d7114]"
              />
              Registrar como correção com motivo (recomendado para auditoria)
            </label>
            {showReason ? (
              <TextInput
                className="anim-fadein mt-2"
                placeholder="Ex.: valor correto informado pelo banco"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                aria-label="Motivo da correção"
              />
            ) : null}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
