import { useMemo, useState } from "react";
import type { CardBrand, CreditCard, InvoiceStatus } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { CARD_BRANDS } from "../data/categories";
import { currentMonthKey, formatDateBR, monthLongLabel, shiftMonthKey, todayISO } from "../utils/date";
import { buildInvoice, cardLimitUsed } from "../utils/finance";
import { formatBRL, parseCurrencyInput } from "../utils/format";
import { validateCard } from "../utils/validation";
import { Badge, Card, PageHeader, ProgressBar, type BadgeTone } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { CurrencyInput, Field, Segmented, SelectInput, TextInput } from "../components/ui/FormControls";
import { IconBank, IconPencil, IconPlus, IconTrash, IconCoins } from "../components/ui/icons";

const STATUS_META: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  aberta: { label: "Aberta", tone: "inv" },
  fechada: { label: "Fechada", tone: "gold" },
  paga: { label: "Paga", tone: "up" },
  parcialmente_paga: { label: "Parcialmente paga", tone: "gold" },
  vencida: { label: "Vencida", tone: "down" },
};

interface CardForm {
  name: string;
  bank: string;
  brand: CardBrand;
  limit: string;
  closingDay: string;
  dueDay: string;
  holder: string;
  additional: boolean;
  annualFee: string;
  benefits: string;
  cashbackPct: string;
  pointsProgram: string;
  accountId: string;
}

function emptyCardForm(): CardForm {
  return {
    name: "",
    bank: "",
    brand: "mastercard",
    limit: "",
    closingDay: "15",
    dueDay: "22",
    holder: "",
    additional: false,
    annualFee: "0",
    benefits: "",
    cashbackPct: "",
    pointsProgram: "",
    accountId: "",
  };
}

export function CardsPage() {
  const {
    status,
    cards,
    accounts,
    transactions,
    invoiceExtras,
    invoicePayments,
    addCard,
    updateCard,
    removeCard,
    payInvoice,
    saveInvoiceExtras,
    openTransactionModal,
    refresh,
  } = useFinance();
  const { push } = useToast();

  const [modal, setModal] = useState<{ open: boolean; editing: CreditCard | null }>({ open: false, editing: null });
  const [form, setForm] = useState<CardForm>(emptyCardForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<CreditCard | null>(null);
  const [payTarget, setPayTarget] = useState<{ card: CreditCard; month: string } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());
  const [payAccount, setPayAccount] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const months = useMemo(
    () => Array.from({ length: 4 }, (_, i) => shiftMonthKey(currentMonthKey(), -(3 - i))),
    [],
  );

  const invoiceOf = (card: CreditCard, month: string) =>
    buildInvoice(card, month, transactions, invoiceExtras, invoicePayments);

  const handleSubmit = () => {
    const validation = validateCard(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    const data = {
      name: form.name.trim(),
      bank: form.bank.trim(),
      brand: form.brand,
      limit: Math.round((parseCurrencyInput(form.limit) ?? 0) * 100) / 100,
      closingDay: Number(form.closingDay),
      dueDay: Number(form.dueDay),
      holder: form.holder.trim() || undefined,
      additional: form.additional,
      annualFee: parseCurrencyInput(form.annualFee) ?? 0,
      benefits: form.benefits.trim() || undefined,
      cashbackPct: form.cashbackPct.trim() ? Number(form.cashbackPct.replace(",", ".")) : undefined,
      pointsProgram: form.pointsProgram.trim() || undefined,
      accountId: form.accountId,
    };
    if (modal.editing) {
      updateCard(modal.editing.id, data);
      push("success", "Cartão atualizado", data.name);
    } else {
      addCard(data);
      push("success", "Cartão cadastrado", data.name);
    }
    setModal({ open: false, editing: null });
  };

  const openNew = () => {
    setForm({ ...emptyCardForm(), accountId: accounts[0]?.id ?? "" });
    setErrors({});
    setModal({ open: true, editing: null });
  };

  const openEdit = (card: CreditCard) => {
    setForm({
      name: card.name,
      bank: card.bank,
      brand: card.brand,
      limit: card.limit.toFixed(2).replace(".", ","),
      closingDay: String(card.closingDay),
      dueDay: String(card.dueDay),
      holder: card.holder ?? "",
      additional: card.additional,
      annualFee: String(card.annualFee).replace(".", ","),
      benefits: card.benefits ?? "",
      cashbackPct: card.cashbackPct !== undefined ? String(card.cashbackPct).replace(".", ",") : "",
      pointsProgram: card.pointsProgram ?? "",
      accountId: card.accountId,
    });
    setErrors({});
    setModal({ open: true, editing: card });
  };

  const openPay = (card: CreditCard, month: string, remaining: number) => {
    setPayTarget({ card, month });
    setPayAmount(remaining.toFixed(2).replace(".", ","));
    setPayDate(todayISO());
    setPayAccount(card.accountId);
  };

  const confirmPay = () => {
    if (!payTarget) return;
    const amount = parseCurrencyInput(payAmount);
    if (amount === null || amount <= 0) {
      push("error", "Valor inválido", "Informe o valor do pagamento.");
      return;
    }
    payInvoice(payTarget.card.id, payTarget.month, amount, payAccount, payDate);
    push("success", "Fatura paga", `${formatBRL(amount)} — limite liberado e conta debitada (sem dupla despesa).`);
    setPayTarget(null);
  };

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  const futureInstallments = transactions.filter(
    (tx) => tx.installmentGroup && tx.date > todayISO() && tx.status !== "cancelada" && tx.status !== "estornada",
  );

  return (
    <div>
      <PageHeader
        title="Cartões de crédito"
        subtitle="Limite disponível calculado automaticamente, incluindo parcelas futuras"
      >
        <Button size="sm" icon={<IconPlus size={15} />} onClick={openNew}>
          Novo cartão
        </Button>
      </PageHeader>

      {status === "loading" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Card className="anim-rise">
          <EmptyState
            icon={<IconBank size={22} />}
            title="Nenhum cartão cadastrado"
            description="Cadastre cartões para controlar limite, faturas e compras parceladas."
            action={
              <Button icon={<IconPlus size={16} />} onClick={openNew}>
                Cadastrar cartão
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {cards.map((card, index) => {
            const used = cardLimitUsed(card, transactions, invoiceExtras, invoicePayments);
            const available = Math.max(0, card.limit - used);
            const usagePct = card.limit > 0 ? used / card.limit : 0;
            const currentInvoice = invoiceOf(card, currentMonthKey());
            const expanded = expandedCard === card.id;
            return (
              <Card key={card.id} hover className="anim-rise overflow-hidden">
                <div style={{ animationDelay: `${60 + index * 60}ms` }}>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-inv/10 text-inv">
                          <IconBank size={19} />
                        </span>
                        <div>
                          <p className="font-display text-[15px] font-bold text-ink">{card.name}</p>
                          <p className="text-xs text-mut">
                            {card.bank} · {CARD_BRANDS.find((b) => b.value === card.brand)?.label}
                            {card.additional ? " · adicional" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <IconButton label={`Editar ${card.name}`} size="sm" onClick={() => openEdit(card)}>
                          <IconPencil size={15} />
                        </IconButton>
                        <IconButton label={`Excluir ${card.name}`} size="sm" tone="danger" onClick={() => setPendingDelete(card)}>
                          <IconTrash size={15} />
                        </IconButton>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[11px] font-semibold text-mut">Limite total</p>
                        <p className="tnum font-display text-base font-bold text-ink">{formatBRL(card.limit)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-mut">Utilizado</p>
                        <p className="tnum font-display text-base font-bold text-down">{formatBRL(used)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-mut">Disponível</p>
                        <p className="tnum font-display text-base font-bold text-up">{formatBRL(available)}</p>
                      </div>
                    </div>
                    <ProgressBar value={usagePct} color={usagePct > 0.9 ? "var(--down)" : usagePct > 0.7 ? "var(--gold)" : "var(--inv)"} className="mt-2" />
                    <p className="mt-1.5 text-[11px] text-mut">
                      {(usagePct * 100).toFixed(0)}% do limite comprometido (compras do mês + parcelas futuras + faturas em aberto)
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.cashbackPct !== undefined ? <Badge tone="up">{card.cashbackPct}% cashback</Badge> : null}
                      {card.pointsProgram ? <Badge tone="inv">{card.pointsProgram}</Badge> : null}
                      <Badge tone="neutral">Fecha dia {card.closingDay}</Badge>
                      <Badge tone="neutral">Vence dia {card.dueDay}</Badge>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button variant="secondary" size="sm" full onClick={() => openTransactionModal({ prefillKind: "despesa" })}>
                        Lançar compra
                      </Button>
                      <Button
                        size="sm"
                        full
                        disabled={currentInvoice.remaining <= 0}
                        onClick={() => openPay(card, currentMonthKey(), currentInvoice.remaining)}
                      >
                        Pagar fatura atual
                      </Button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedCard(expanded ? null : card.id)}
                    className="flex w-full items-center justify-between border-t border-line bg-card2/50 px-5 py-2.5 text-xs font-semibold text-mut transition-colors hover:text-ink"
                  >
                    Faturas dos últimos meses
                    <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
                  </button>
                  {expanded ? (
                    <div className="anim-fadein divide-y divide-line">
                      {[...months].reverse().map((month) => {
                        const invoice = invoiceOf(card, month);
                        const meta = STATUS_META[invoice.status];
                        return (
                          <div key={month} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-ink">{monthLongLabel(month)}</p>
                              <p className="text-[11px] text-mut">
                                {invoice.purchases.length} compras · fecha {formatDateBR(invoice.closingDate)} · vence {formatDateBR(invoice.dueDate)}
                                {invoice.extrasTotal > 0 ? ` · encargos ${formatBRL(invoice.extrasTotal)}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone={meta.tone}>{meta.label}</Badge>
                              <span className="tnum text-sm font-bold text-ink">{formatBRL(invoice.total)}</span>
                              {invoice.remaining > 0 ? (
                                <Button size="sm" variant="soft" onClick={() => openPay(card, month, invoice.remaining)}>
                                  Pagar {formatBRL(invoice.remaining)}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {futureInstallments.length > 0 ? (
        <Card className="anim-rise mt-4 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink">Parcelas futuras</h3>
            <Badge tone="inv">{futureInstallments.length}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-mut">
                  <th className="pb-2 pr-3 font-semibold">Compra</th>
                  <th className="pb-2 pr-3 font-semibold">Parcela</th>
                  <th className="pb-2 pr-3 font-semibold">Vencimento</th>
                  <th className="tnum pb-2 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {futureInstallments
                  .sort((a, b) => (a.date < b.date ? -1 : 1))
                  .slice(0, 10)
                  .map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2.5 pr-3 font-medium text-ink">{tx.description.replace(/\s\(\d+\/\d+\)$/, "")}</td>
                      <td className="py-2.5 pr-3 text-mut">
                        {tx.installmentNumber}/{tx.installmentTotal}
                      </td>
                      <td className="py-2.5 pr-3 text-mut">{formatDateBR(tx.date)}</td>
                      <td className="tnum py-2.5 text-right font-bold text-ink">{formatBRL(tx.amount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* Modal cartão */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? "Editar cartão" : "Novo cartão"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, editing: null })}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>{modal.editing ? "Salvar" : "Cadastrar"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field id="card-name" label="Nome" error={errors.name}>
              <TextInput id="card-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Nubank Ultravioleta" invalid={Boolean(errors.name)} maxLength={60} />
            </Field>
            <Field id="card-bank" label="Banco" error={errors.bank}>
              <TextInput id="card-bank" value={form.bank} onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))} placeholder="Ex.: Nubank" invalid={Boolean(errors.bank)} maxLength={60} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field id="card-brand" label="Bandeira">
              <SelectInput id="card-brand" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value as CardBrand }))}>
                {CARD_BRANDS.map((brand) => (
                  <option key={brand.value} value={brand.value}>{brand.label}</option>
                ))}
              </SelectInput>
            </Field>
            <Field id="card-closing" label="Fechamento (dia)" error={errors.closingDay}>
              <TextInput id="card-closing" inputMode="numeric" value={form.closingDay} onChange={(e) => setForm((f) => ({ ...f, closingDay: e.target.value.replace(/\D/g, "") }))} invalid={Boolean(errors.closingDay)} />
            </Field>
            <Field id="card-due" label="Vencimento (dia)" error={errors.dueDay}>
              <TextInput id="card-due" inputMode="numeric" value={form.dueDay} onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value.replace(/\D/g, "") }))} invalid={Boolean(errors.dueDay)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="card-limit" label="Limite total" error={errors.limit}>
              <CurrencyInput id="card-limit" value={form.limit} onValueChange={(value) => setForm((f) => ({ ...f, limit: value }))} invalid={Boolean(errors.limit)} />
            </Field>
            <Field id="card-account" label="Conta que paga a fatura" error={errors.accountId}>
              <SelectInput id="card-account" value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))} invalid={Boolean(errors.accountId)}>
                <option value="">Selecione…</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.institution}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field id="card-fee" label="Anuidade">
              <CurrencyInput id="card-fee" value={form.annualFee} onValueChange={(value) => setForm((f) => ({ ...f, annualFee: value }))} />
            </Field>
            <Field id="card-cashback" label="Cashback (%)">
              <TextInput id="card-cashback" inputMode="decimal" value={form.cashbackPct} onChange={(e) => setForm((f) => ({ ...f, cashbackPct: e.target.value }))} placeholder="Ex.: 1" />
            </Field>
            <Field id="card-points" label="Programa de pontos">
              <TextInput id="card-points" value={form.pointsProgram} onChange={(e) => setForm((f) => ({ ...f, pointsProgram: e.target.value }))} maxLength={40} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="card-holder" label="Titular">
              <TextInput id="card-holder" value={form.holder} onChange={(e) => setForm((f) => ({ ...f, holder: e.target.value }))} maxLength={60} />
            </Field>
            <Field id="card-additional" label="Cartão adicional?">
              <Segmented
                ariaLabel="Cartão adicional"
                value={form.additional ? "sim" : "nao"}
                onChange={(value) => setForm((f) => ({ ...f, additional: value === "sim" }))}
                options={[
                  { value: "nao", label: "Não" },
                  { value: "sim", label: "Sim" },
                ]}
              />
            </Field>
          </div>
          <Field id="card-benefits" label="Benefícios">
            <TextInput id="card-benefits" value={form.benefits} onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))} placeholder="Ex.: sala VIP, seguro viagem" maxLength={100} />
          </Field>
        </div>
      </Modal>

      {/* Modal pagamento de fatura */}
      <Modal
        open={payTarget !== null}
        onClose={() => setPayTarget(null)}
        title={`Pagar fatura ${payTarget ? payTarget.month.split("-").reverse().join("/") : ""}`}
        subtitle="O pagamento debita a conta e libera limite — as compras já foram reconhecidas como despesa, sem duplicar."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmPay} icon={<IconCoins size={15} />}>
              Confirmar pagamento
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field id="pay-amount" label="Valor do pagamento">
            <CurrencyInput id="pay-amount" value={payAmount} onValueChange={setPayAmount} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="pay-account" label="Conta de débito">
              <SelectInput id="pay-account" value={payAccount} onChange={(e) => setPayAccount(e.target.value)}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.institution}</option>
                ))}
              </SelectInput>
            </Field>
            <Field id="pay-date" label="Data">
              <TextInput id="pay-date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir cartão"
        message={
          <p>
            Excluir <strong className="text-ink">{pendingDelete?.name}</strong>? As compras já
            lançadas permanecem no histórico de movimentações.
          </p>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            removeCard(pendingDelete.id);
            push("success", "Cartão excluído", pendingDelete.name);
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
