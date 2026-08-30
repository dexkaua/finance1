import { useMemo, useState } from "react";
import type { Account, AccountType, Currency, Transaction } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { ACCOUNT_TYPES, accountTypeLabel, KIND_META } from "../data/categories";
import { formatDayMonth } from "../utils/date";
import { accountBalance, accountSign, isActive, sortTransactionsDesc } from "../utils/finance";
import { formatBRL, formatSignedBRL, parseCurrencyInput } from "../utils/format";
import { validateAccount } from "../utils/validation";
import { Badge, Card, PageHeader, SectionHeader } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { CurrencyInput, Field, Segmented, SelectInput, TextInput } from "../components/ui/FormControls";
import {
  IconBank,
  IconCoins,
  IconPencil,
  IconPlus,
  IconTrash,
  IconWallet,
  IconCheck,
  IconAlert,
} from "../components/ui/icons";

interface AccountForm {
  institution: string;
  type: AccountType | "";
  agency: string;
  number: string;
  currency: Currency;
  initialBalance: string;
  limit: string;
  holder: string;
  joint: boolean;
  openedAt: string;
  note: string;
}

function emptyForm(): AccountForm {
  return {
    institution: "",
    type: "",
    agency: "",
    number: "",
    currency: "BRL",
    initialBalance: "0",
    limit: "",
    holder: "",
    joint: false,
    openedAt: "",
    note: "",
  };
}

function accountForm(account: Account): AccountForm {
  return {
    institution: account.institution,
    type: account.type,
    agency: account.agency ?? "",
    number: account.number ?? "",
    currency: account.currency,
    initialBalance: account.initialBalance.toFixed(2).replace(".", ","),
    limit: account.limit !== undefined ? String(account.limit) : "",
    holder: account.holder ?? "",
    joint: account.joint,
    openedAt: account.openedAt ?? "",
    note: account.note ?? "",
  };
}

export function AccountsPage() {
  const {
    status,
    accounts,
    transactions,
    addAccount,
    updateAccount,
    removeAccount,
    openTransactionModal,
    refresh,
  } = useFinance();
  const { push } = useToast();

  const [modal, setModal] = useState<{ open: boolean; editing: Account | null }>({ open: false, editing: null });
  const [form, setForm] = useState<AccountForm>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [statementInput, setStatementInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const balances = useMemo(
    () => new Map(accounts.map((a) => [a.id, accountBalance(a, transactions)])),
    [accounts, transactions],
  );
  const total = useMemo(() => Array.from(balances.values()).reduce((a, b) => a + b, 0), [balances]);

  const movementsOf = (accountId: string): Transaction[] =>
    sortTransactionsDesc(
      transactions.filter(
        (tx) =>
          (tx.accountId === accountId && (accountSign(tx) !== 0 || tx.kind === "transferencia")) ||
          (tx.kind === "transferencia" && tx.toAccountId === accountId),
      ),
    ).slice(0, 12);

  const openNew = () => {
    setForm(emptyForm());
    setErrors({});
    setModal({ open: true, editing: null });
  };

  const openEdit = (account: Account) => {
    setForm(accountForm(account));
    setErrors({});
    setModal({ open: true, editing: account });
  };

  const handleSubmit = () => {
    const validation = validateAccount(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    const data = {
      institution: form.institution.trim(),
      type: form.type as AccountType,
      agency: form.agency.trim() || undefined,
      number: form.number.trim() || undefined,
      currency: form.currency,
      initialBalance: Math.round((parseCurrencyInput(form.initialBalance) ?? 0) * 100) / 100,
      limit: form.limit.trim() ? Number(form.limit) : undefined,
      holder: form.holder.trim() || undefined,
      joint: form.joint,
      openedAt: form.openedAt || undefined,
      note: form.note.trim() || undefined,
    };
    if (modal.editing) {
      updateAccount(modal.editing.id, data);
      push("success", "Conta atualizada", data.institution);
    } else {
      addAccount(data);
      push("success", "Conta criada", data.institution);
    }
    setModal({ open: false, editing: null });
  };

  const reconcileAccount = accounts.find((a) => a.id === reconcileId);
  const reconcileBalance = reconcileAccount ? balances.get(reconcileAccount.id) ?? 0 : 0;
  const statementValue = parseCurrencyInput(statementInput);
  const diff = statementValue !== null ? statementValue - reconcileBalance : null;

  const suspects = useMemo(() => {
    if (!reconcileAccount || diff === null || Math.abs(diff) < 0.005) return [];
    return transactions
      .filter((tx) => isActive(tx) && tx.accountId === reconcileAccount.id && Math.abs(tx.amount - Math.abs(diff)) < 0.01)
      .slice(0, 5);
  }, [reconcileAccount, diff, transactions]);

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  return (
    <div>
      <PageHeader
        title="Contas"
        subtitle="Saldos derivados das movimentações — nunca misturados com investimentos"
      >
        <Button size="sm" icon={<IconPlus size={15} />} onClick={openNew}>
          Nova conta
        </Button>
      </PageHeader>

      {status === "loading" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="anim-rise">
          <EmptyState
            icon={<IconWallet size={22} />}
            title="Nenhuma conta cadastrada"
            description="Crie contas corrente, poupança, carteira ou internacionais para registrar movimentações."
            action={
              <Button icon={<IconPlus size={16} />} onClick={openNew}>
                Criar primeira conta
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="anim-rise flex flex-wrap items-end justify-between gap-3 p-5">
            <div>
              <p className="text-[13px] font-semibold text-mut">Saldo total em contas</p>
              <p className="tnum mt-1 font-display text-2xl font-bold text-ink">{formatBRL(total)}</p>
            </div>
            <p className="text-xs text-mut">
              {accounts.length} contas · valores derivados do histórico, nunca editados manualmente
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account, index) => {
              const balance = balances.get(account.id) ?? 0;
              const movements = movementsOf(account.id);
              const expanded = expandedId === account.id;
              return (
                <Card key={account.id} hover className="anim-rise overflow-hidden">
                  <div style={{ animationDelay: `${60 + index * 50}ms` }}>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-up/10 text-up">
                            {account.type === "carteira" ? <IconCoins size={19} /> : <IconBank size={19} />}
                          </span>
                          <div>
                            <p className="font-display text-[15px] font-bold text-ink">{account.institution}</p>
                            <p className="text-xs text-mut">
                              {accountTypeLabel(account.type)}
                              {account.number ? ` · ${account.number}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <IconButton label={`Editar ${account.institution}`} size="sm" onClick={() => openEdit(account)}>
                            <IconPencil size={15} />
                          </IconButton>
                          <IconButton
                            label={`Excluir ${account.institution}`}
                            size="sm"
                            tone="danger"
                            onClick={() => setPendingDelete(account)}
                          >
                            <IconTrash size={15} />
                          </IconButton>
                        </div>
                      </div>
                      <p className={`tnum mt-4 font-display text-[26px] font-bold leading-none ${balance >= 0 ? "text-ink" : "text-down"}`}>
                        {formatBRL(balance)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {account.joint ? <Badge tone="neutral">Conjunta</Badge> : null}
                        {account.currency !== "BRL" ? <Badge tone="inv">{account.currency}</Badge> : null}
                        {account.limit !== undefined ? <Badge tone="neutral">Limite {formatBRL(account.limit)}</Badge> : null}
                        {account.statementBalance !== null && account.statementBalance !== undefined ? (
                          <Badge tone={Math.abs(account.statementBalance - balance) < 0.01 ? "up" : "gold"}>
                            <IconCheck size={11} /> conciliada
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="secondary" size="sm" full onClick={() => openTransactionModal({ prefillAccountId: account.id })}>
                          Movimentar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReconcileId(account.id);
                            setStatementInput(account.statementBalance !== null && account.statementBalance !== undefined ? account.statementBalance.toFixed(2).replace(".", ",") : "");
                          }}
                        >
                          Reconciliar
                        </Button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : account.id)}
                      className="flex w-full items-center justify-between border-t border-line bg-card2/50 px-5 py-2.5 text-xs font-semibold text-mut transition-colors hover:text-ink"
                    >
                      Últimas movimentações ({movements.length})
                      <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
                    </button>
                    {expanded ? (
                      <ul className="anim-fadein divide-y divide-line">
                        {movements.length === 0 ? (
                          <li className="px-5 py-4 text-center text-xs text-mut">Sem movimentações ainda.</li>
                        ) : (
                          movements.map((tx) => {
                            const inflow =
                              (tx.accountId === account.id && accountSign(tx) > 0) ||
                              tx.toAccountId === account.id;
                            return (
                              <li key={tx.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                                <span className="min-w-0">
                                  <span className="block truncate text-[13px] font-medium text-ink">{tx.description}</span>
                                  <span className="text-[11px] text-mut">
                                    {formatDayMonth(tx.date)} · {KIND_META[tx.kind].label}
                                  </span>
                                </span>
                                <span className={`tnum shrink-0 text-[13px] font-bold ${inflow ? "text-up" : "text-down"}`}>
                                  {formatSignedBRL(inflow ? tx.amount : -tx.amount)}
                                </span>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? "Editar conta" : "Nova conta"}
        subtitle="O saldo atual é sempre calculado a partir do saldo inicial + movimentações."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, editing: null })}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>{modal.editing ? "Salvar" : "Criar conta"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
            <Field id="acc-institution" label="Instituição" error={errors.institution}>
              <TextInput
                id="acc-institution"
                value={form.institution}
                onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                placeholder="Ex.: Nubank, Itaú, Carteira…"
                invalid={Boolean(errors.institution)}
                maxLength={60}
              />
            </Field>
            <Field id="acc-type" label="Tipo" error={errors.type}>
              <SelectInput
                id="acc-type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}
                invalid={Boolean(errors.type)}
              >
                <option value="">Selecione…</option>
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field id="acc-agency" label="Agência">
              <TextInput id="acc-agency" value={form.agency} onChange={(e) => setForm((f) => ({ ...f, agency: e.target.value }))} maxLength={10} />
            </Field>
            <Field id="acc-number" label="Conta">
              <TextInput id="acc-number" value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} maxLength={20} />
            </Field>
            <Field id="acc-currency" label="Moeda">
              <SelectInput id="acc-currency" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}>
                <option value="BRL">R$ Real</option>
                <option value="USD">US$ Dólar</option>
                <option value="EUR">€ Euro</option>
              </SelectInput>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="acc-initial" label="Saldo inicial" error={errors.initialBalance} hint="Saldo na abertura da conta">
              <CurrencyInput
                id="acc-initial"
                value={form.initialBalance}
                onValueChange={(value) => setForm((f) => ({ ...f, initialBalance: value }))}
                invalid={Boolean(errors.initialBalance)}
              />
            </Field>
            <Field id="acc-limit" label="Limite (cheque especial)">
              <TextInput id="acc-limit" inputMode="decimal" value={form.limit} onChange={(e) => setForm((f) => ({ ...f, limit: e.target.value }))} placeholder="Opcional" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="acc-holder" label="Titular">
              <TextInput id="acc-holder" value={form.holder} onChange={(e) => setForm((f) => ({ ...f, holder: e.target.value }))} maxLength={60} />
            </Field>
            <Field id="acc-opened" label="Data de abertura">
              <TextInput id="acc-opened" type="date" value={form.openedAt} onChange={(e) => setForm((f) => ({ ...f, openedAt: e.target.value }))} />
            </Field>
          </div>
          <Field id="acc-joint" label="Conta conjunta?">
            <Segmented
              ariaLabel="Conta conjunta"
              value={form.joint ? "sim" : "nao"}
              onChange={(value) => setForm((f) => ({ ...f, joint: value === "sim" }))}
              options={[
                { value: "nao", label: "Não" },
                { value: "sim", label: "Sim" },
              ]}
            />
          </Field>
          <Field id="acc-note" label="Observações">
            <TextInput id="acc-note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} maxLength={120} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={reconcileAccount !== null && reconcileId !== null}
        onClose={() => setReconcileId(null)}
        title={`Reconciliar ${reconcileAccount?.institution ?? ""}`}
        subtitle="Compare o saldo do extrato do banco com o saldo calculado pelo sistema."
        footer={
          <Button variant="secondary" onClick={() => setReconcileId(null)}>
            Fechar
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-card2/60 p-4 text-center">
              <p className="text-xs font-semibold text-mut">Sistema</p>
              <p className="tnum mt-1 font-display text-xl font-bold text-ink">{formatBRL(reconcileBalance)}</p>
            </div>
            <div className="rounded-xl border border-line bg-card2/60 p-4 text-center">
              <p className="text-xs font-semibold text-mut">Banco (informe)</p>
              <CurrencyInput
                value={statementInput}
                onValueChange={setStatementInput}
                aria-label="Saldo do extrato bancário"
                className="mt-1 text-center font-bold"
              />
            </div>
          </div>
          {diff !== null ? (
            Math.abs(diff) < 0.005 ? (
              <div className="flex items-center gap-3 rounded-xl border border-up/30 bg-up/5 p-4">
                <IconCheck size={22} className="text-up" />
                <div>
                  <p className="text-sm font-bold text-up">Resultado: OK</p>
                  <p className="text-xs text-mut">Os saldos batem exatamente.</p>
                </div>
                <Button
                  size="sm"
                  variant="soft"
                  className="ml-auto"
                  onClick={() => {
                    if (reconcileAccount) {
                      updateAccount(reconcileAccount.id, { statementBalance: statementValue });
                      push("success", "Conta reconciliada", `${reconcileAccount.institution} marcada como conciliada.`);
                      setReconcileId(null);
                    }
                  }}
                >
                  Salvar conciliação
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-gold">
                  <IconAlert size={17} /> Diferença: {formatBRL(diff)}
                </p>
                {suspects.length > 0 ? (
                  <>
                    <p className="mt-2 text-xs font-semibold text-mut">
                      Possíveis lançamentos responsáveis (mesmo valor da diferença):
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {suspects.map((tx) => (
                        <li key={tx.id} className="flex justify-between text-xs text-ink">
                          <span className="truncate">{tx.description}</span>
                          <span className="tnum text-mut">{formatDayMonth(tx.date)} · {formatBRL(tx.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-mut">
                    Nenhum lançamento com o valor exato da diferença foi encontrado.
                  </p>
                )}
              </div>
            )
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir conta"
        message={
          <p>
            Excluir <strong className="text-ink">{pendingDelete?.institution}</strong>? As
            movimentações vinculadas permanecem no histórico, mas ficarão sem conta válida — o
            verificador de qualidade apontará isso.
          </p>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            removeAccount(pendingDelete.id);
            push("success", "Conta excluída", pendingDelete.institution);
          }
          setPendingDelete(null);
        }}
      />

      <div className="sr-only">
        <SectionHeader title="Contas" />
      </div>
    </div>
  );
}
