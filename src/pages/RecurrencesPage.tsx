import { useMemo, useState } from "react";
import type { Recurrence, RecurrenceFrequency } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { RECURRENCE_FREQUENCIES, rootCategoriesOf } from "../data/categories";
import { addDaysISO, formatDateBR, todayISO } from "../utils/date";
import { detectRecurrences } from "../utils/finance";
import { formatBRL, parseCurrencyInput } from "../utils/format";
import { Badge, Card, PageHeader, SectionHeader } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { CurrencyInput, Field, SelectInput, TextInput } from "../components/ui/FormControls";
import { IconCheck, IconPencil, IconPlus, IconSun, IconTrash, IconAlert } from "../components/ui/icons";

const FREQ_DAYS: Record<RecurrenceFrequency, number> = {
  semanal: 7,
  quinzenal: 14,
  mensal: 30,
  trimestral: 91,
  semestral: 182,
  anual: 365,
};

export function RecurrencesPage() {
  const {
    status,
    recurrences,
    transactions,
    accounts,
    cards,
    addRecurrence,
    updateRecurrence,
    removeRecurrence,
    generateRecurrences,
    refresh,
  } = useFinance();
  const { push } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recurrence | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Recurrence | null>(null);
  const [form, setForm] = useState({
    description: "",
    categoryId: "",
    accountId: "",
    cardId: "",
    amount: "",
    frequency: "mensal" as RecurrenceFrequency,
    nextDate: addDaysISO(todayISO(), 7),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = useMemo(() => rootCategoriesOf("despesa"), []);
  const active = recurrences.filter((r) => r.active);
  const monthlyTotal = active.reduce((acc, r) => {
    const factor = 30 / FREQ_DAYS[r.frequency];
    return acc + r.amount * factor;
  }, 0);
  const suggestions = useMemo(
    () => detectRecurrences(transactions, recurrences).slice(0, 6),
    [transactions, recurrences],
  );

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (form.description.trim().length < 3) errs.description = "Informe a descrição.";
    const amount = parseCurrencyInput(form.amount);
    if (amount === null || amount <= 0) errs.amount = "Informe o valor.";
    if (!form.categoryId) errs.categoryId = "Escolha a categoria.";
    if (!form.accountId) errs.accountId = "Escolha a conta.";
    if (!form.nextDate) errs.nextDate = "Informe a próxima cobrança.";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const data = {
      description: form.description.trim(),
      categoryId: form.categoryId,
      accountId: form.accountId,
      cardId: form.cardId || undefined,
      amount: Math.round((amount ?? 0) * 100) / 100,
      frequency: form.frequency,
      nextDate: form.nextDate,
      active: true,
    };
    if (editing) {
      updateRecurrence(editing.id, data);
      push("success", "Recorrência atualizada", data.description);
    } else {
      addRecurrence(data);
      push("success", "Recorrência criada", data.description);
    }
    setModalOpen(false);
  };

  const acceptSuggestion = (suggestion: (typeof suggestions)[number]) => {
    addRecurrence({
      description: suggestion.description,
      categoryId: suggestion.categoryId,
      accountId: accounts[0]?.id ?? "",
      amount: suggestion.amount,
      frequency: "mensal",
      nextDate: addDaysISO(todayISO(), 30),
      active: true,
    });
    push("success", "Assinatura adicionada", `${suggestion.description} agora é controlada.`);
  };

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  return (
    <div>
      <PageHeader
        title="Assinaturas e recorrências"
        subtitle={
          active.length > 0
            ? `Você possui ${active.length} despesas recorrentes · total mensal ≈ ${formatBRL(monthlyTotal)}`
            : "Controle cobranças que se repetem e detecte assinaturas esquecidas"
        }
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const created = generateRecurrences(30);
            push(
              created > 0 ? "success" : "info",
              created > 0 ? "Lançamentos gerados" : "Nada a gerar",
              created > 0 ? `${created} cobranças dos próximos 30 dias lançadas no extrato.` : "Todas as recorrências dos próximos 30 dias já estão lançadas.",
            );
          }}
        >
          Gerar próximos 30 dias
        </Button>
        <Button size="sm" icon={<IconPlus size={15} />} onClick={() => {
          setEditing(null);
          setForm({ description: "", categoryId: "", accountId: accounts[0]?.id ?? "", cardId: "", amount: "", frequency: "mensal", nextDate: addDaysISO(todayISO(), 7) });
          setErrors({});
          setModalOpen(true);
        }}>
          Nova recorrência
        </Button>
      </PageHeader>

      {status === "loading" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.length > 0 ? (
            <Card className="anim-rise border-gold/40 bg-gold/5 p-5">
              <SectionHeader
                title="Possíveis assinaturas detectadas"
                subtitle="Cobranças com mesmo valor em 3+ meses que você ainda não controla"
              />
              <ul className="space-y-2">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.description} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-card px-3.5 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{suggestion.description}</span>
                      <span className="text-[11px] text-mut">{suggestion.occurrences} meses detectados · possível assinatura esquecida ou duplicada</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tnum text-sm font-bold text-ink">{formatBRL(suggestion.amount)}/mês</span>
                      <Button size="sm" variant="soft" onClick={() => acceptSuggestion(suggestion)}>
                        Controlar
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {recurrences.length === 0 ? (
            <Card className="anim-rise">
              <EmptyState
                icon={<IconSun size={22} />}
                title="Nenhuma recorrência controlada"
                description="Netflix, Spotify, academia, internet… cadastre para ver o total mensal e não ser pego de surpresa."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {recurrences.map((recurrence, index) => (
                <Card key={recurrence.id} hover className={`anim-rise p-5 ${!recurrence.active ? "opacity-60" : ""}`}>
                  <div style={{ animationDelay: `${60 + index * 50}ms` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-[15px] font-bold text-ink">{recurrence.description}</p>
                        <p className="mt-0.5 text-xs text-mut">
                          {RECURRENCE_FREQUENCIES.find((f) => f.value === recurrence.frequency)?.label} ·
                          próxima em {formatDateBR(recurrence.nextDate)}
                          {recurrence.cardId ? ` · no cartão ${cards.find((c) => c.id === recurrence.cardId)?.name ?? ""}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-0.5">
                        <IconButton
                          label={recurrence.active ? "Pausar" : "Reativar"}
                          size="sm"
                          onClick={() => {
                            updateRecurrence(recurrence.id, { active: !recurrence.active });
                            push("info", recurrence.active ? "Recorrência pausada" : "Recorrência reativada", recurrence.description);
                          }}
                        >
                          <IconCheck size={15} />
                        </IconButton>
                        <IconButton
                          label={`Editar ${recurrence.description}`}
                          size="sm"
                          onClick={() => {
                            setEditing(recurrence);
                            setForm({
                              description: recurrence.description,
                              categoryId: recurrence.categoryId,
                              accountId: recurrence.accountId,
                              cardId: recurrence.cardId ?? "",
                              amount: recurrence.amount.toFixed(2).replace(".", ","),
                              frequency: recurrence.frequency,
                              nextDate: recurrence.nextDate,
                            });
                            setErrors({});
                            setModalOpen(true);
                          }}
                        >
                          <IconPencil size={15} />
                        </IconButton>
                        <IconButton label={`Excluir ${recurrence.description}`} size="sm" tone="danger" onClick={() => setPendingDelete(recurrence)}>
                          <IconTrash size={15} />
                        </IconButton>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="tnum font-display text-xl font-bold text-ink">{formatBRL(recurrence.amount)}</p>
                      {recurrence.active ? <Badge tone="up">Ativa</Badge> : <Badge tone="neutral">Pausada</Badge>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar recorrência" : "Nova recorrência"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editing ? "Salvar" : "Criar"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
            <Field id="rec-desc" label="Descrição" error={errors.description}>
              <TextInput id="rec-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ex.: Netflix" invalid={Boolean(errors.description)} maxLength={60} />
            </Field>
            <Field id="rec-amount" label="Valor" error={errors.amount}>
              <CurrencyInput id="rec-amount" value={form.amount} onValueChange={(v) => setForm((f) => ({ ...f, amount: v }))} invalid={Boolean(errors.amount)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="rec-cat" label="Categoria" error={errors.categoryId}>
              <SelectInput id="rec-cat" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} invalid={Boolean(errors.categoryId)}>
                <option value="">Selecione…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </SelectInput>
            </Field>
            <Field id="rec-freq" label="Frequência">
              <SelectInput id="rec-freq" value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as RecurrenceFrequency }))}>
                {RECURRENCE_FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="rec-account" label="Conta" error={errors.accountId}>
              <SelectInput id="rec-account" value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))} invalid={Boolean(errors.accountId)}>
                <option value="">Selecione…</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.institution}</option>
                ))}
              </SelectInput>
            </Field>
            <Field id="rec-card" label="Cartão (opcional)">
              <SelectInput id="rec-card" value={form.cardId} onChange={(e) => setForm((f) => ({ ...f, cardId: e.target.value }))}>
                <option value="">Não</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>{card.name}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <Field id="rec-next" label="Próxima cobrança" error={errors.nextDate}>
            <TextInput id="rec-next" type="date" value={form.nextDate} onChange={(e) => setForm((f) => ({ ...f, nextDate: e.target.value }))} invalid={Boolean(errors.nextDate)} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir recorrência"
        message={<p>Excluir <strong className="text-ink">{pendingDelete?.description}</strong>? Lançamentos já gerados permanecem no extrato.</p>}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            removeRecurrence(pendingDelete.id);
            push("success", "Recorrência excluída", pendingDelete.description);
          }
          setPendingDelete(null);
        }}
      />

      <div className="sr-only"><IconAlert size={1} /></div>
    </div>
  );
}
