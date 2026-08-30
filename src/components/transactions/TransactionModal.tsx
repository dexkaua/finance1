import { useEffect, useState } from "react";
import type { PaymentMethod, Transaction, TransactionType } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import { useToast } from "../../contexts/ToastContext";
import { categoriesOf, PAYMENT_METHODS } from "../../data/categories";
import { todayISO } from "../../utils/date";
import { formatBRL, parseCurrencyInput } from "../../utils/format";
import { validateTransaction, type FieldErrors } from "../../utils/validation";
import { Button } from "../ui/Button";
import { CurrencyInput, Field, Segmented, SelectInput, TextInput } from "../ui/FormControls";
import { Modal } from "../ui/Modal";

interface FormState {
  type: TransactionType;
  description: string;
  amount: string;
  categoryId: string;
  date: string;
  paymentMethod: PaymentMethod | "";
}

function initialState(editing: Transaction | null): FormState {
  if (editing) {
    return {
      type: editing.type,
      description: editing.description,
      amount: editing.amount.toFixed(2).replace(".", ","),
      categoryId: editing.categoryId,
      date: editing.date,
      paymentMethod: editing.paymentMethod,
    };
  }
  return {
    type: "despesa",
    description: "",
    amount: "",
    categoryId: "",
    date: todayISO(),
    paymentMethod: "pix",
  };
}

export function TransactionModal() {
  const { txModal, closeTransactionModal, addTransaction, updateTransaction } = useFinance();
  const { push } = useToast();
  const [form, setForm] = useState<FormState>(() => initialState(null));
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (txModal.open) {
      setForm(initialState(txModal.editing));
      setErrors({});
    }
  }, [txModal.open, txModal.editing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const categoryOptions = categoriesOf(form.type);

  const handleSubmit = () => {
    const validation = validateTransaction({ ...form, paymentMethod: form.paymentMethod });
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    const amount = Math.round((parseCurrencyInput(form.amount) ?? 0) * 100) / 100;
    const input = {
      type: form.type,
      description: form.description.trim(),
      amount,
      categoryId: form.categoryId,
      date: form.date,
      paymentMethod: form.paymentMethod as PaymentMethod,
    };
    if (txModal.editing) {
      updateTransaction(txModal.editing.id, input);
      push("success", "Movimentação atualizada", `${input.description} · ${formatBRL(amount)}`);
    } else {
      addTransaction(input);
      push("success", "Movimentação adicionada", `${input.description} · ${formatBRL(amount)}`);
    }
    closeTransactionModal();
  };

  return (
    <Modal
      open={txModal.open}
      onClose={closeTransactionModal}
      title={txModal.editing ? "Editar movimentação" : "Nova movimentação"}
      subtitle="Lance uma receita, despesa ou aporte."
      footer={
        <>
          <Button variant="secondary" onClick={closeTransactionModal}>
            Cancelar
          </Button>
          <Button type="submit" form="transaction-form">
            {txModal.editing ? "Salvar alterações" : "Adicionar"}
          </Button>
        </>
      }
    >
      <form
        id="transaction-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <Field id="tx-type" label="Tipo">
          <Segmented
            ariaLabel="Tipo de movimentação"
            value={form.type}
            onChange={(type) => {
              setForm((prev) => ({ ...prev, type, categoryId: "" }));
              setErrors({});
            }}
            options={[
              { value: "receita", label: "Receita", activeClass: "text-up" },
              { value: "despesa", label: "Despesa", activeClass: "text-down" },
              { value: "investimento", label: "Aporte", activeClass: "text-inv" },
            ]}
          />
        </Field>

        <Field id="tx-description" label="Descrição" error={errors.description}>
          <TextInput
            id="tx-description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Ex.: Supermercado, salário, aporte no CDB…"
            invalid={Boolean(errors.description)}
            maxLength={80}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="tx-amount" label="Valor" error={errors.amount}>
            <CurrencyInput
              id="tx-amount"
              value={form.amount}
              onValueChange={(value) => set("amount", value)}
              invalid={Boolean(errors.amount)}
            />
          </Field>
          <Field id="tx-date" label="Data" error={errors.date}>
            <TextInput
              id="tx-date"
              type="date"
              value={form.date}
              max={todayISO()}
              onChange={(e) => set("date", e.target.value)}
              invalid={Boolean(errors.date)}
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
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id="tx-payment" label="Pagamento" error={errors.paymentMethod}>
            <SelectInput
              id="tx-payment"
              value={form.paymentMethod}
              onChange={(e) => set("paymentMethod", e.target.value as PaymentMethod)}
              invalid={Boolean(errors.paymentMethod)}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
