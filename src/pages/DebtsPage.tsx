import { useMemo, useState } from "react";
import type { Debt, DebtKind } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { DEBT_KINDS } from "../data/categories";
import { dayInMonth, currentMonthKey, formatDateBR, todayISO } from "../utils/date";
import { debtVsInvest, priceTable, sacTable } from "../utils/simulations";
import { formatBRL, formatPercent, formatSignedBRL, parseCurrencyInput } from "../utils/format";
import { validateDebt } from "../utils/validation";
import { Badge, Card, PageHeader, ProgressBar, SectionHeader } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { CurrencyInput, Field, SelectInput, TextInput } from "../components/ui/FormControls";
import { IconAlert, IconPencil, IconPlus, IconTrash, IconCoins } from "../components/ui/icons";

interface DebtForm {
  kind: DebtKind;
  creditor: string;
  purpose: string;
  originalAmount: string;
  balance: string;
  annualRate: string;
  cet: string;
  totalInstallments: string;
  paidInstallments: string;
  monthlyPayment: string;
  dueDay: string;
  startDate: string;
  note: string;
  consorcioAdmin: string;
  consorcioLetter: string;
  consorcioFee: string;
}

function emptyDebtForm(): DebtForm {
  return {
    kind: "divida",
    creditor: "",
    purpose: "",
    originalAmount: "",
    balance: "",
    annualRate: "",
    cet: "",
    totalInstallments: "12",
    paidInstallments: "0",
    monthlyPayment: "",
    dueDay: "10",
    startDate: todayISO(),
    note: "",
    consorcioAdmin: "",
    consorcioLetter: "",
    consorcioFee: "",
  };
}

export function DebtsPage() {
  const { status, debts, addDebt, updateDebt, removeDebt, addDebtPayment, settings, refresh } = useFinance();
  const { push } = useToast();
  const [modal, setModal] = useState<{ open: boolean; editing: Debt | null }>({ open: false, editing: null });
  const [form, setForm] = useState<DebtForm>(emptyDebtForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<Debt | null>(null);
  const [payTarget, setPayTarget] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payKind, setPayKind] = useState<"parcela" | "amortizacao" | "antecipacao">("parcela");
  const [simDebt, setSimDebt] = useState<Debt | null>(null);
  const [amortDebt, setAmortDebt] = useState<Debt | null>(null);
  const [amortSystem, setAmortSystem] = useState<"price" | "sac">("price");

  const totalBalance = useMemo(() => debts.reduce((a, d) => a + Math.max(0, d.balance), 0), [debts]);
  const totalMonthly = useMemo(() => debts.reduce((a, d) => a + d.monthlyPayment, 0), [debts]);

  const simulation = useMemo(() => {
    if (!simDebt) return null;
    return debtVsInvest({
      debtBalance: simDebt.balance,
      debtAnnualRatePct: simDebt.annualRate,
      monthlyPayment: simDebt.monthlyPayment,
      investAnnualRatePct: settings.benchmarks.cdi + 1,
      horizonYears: 5,
    });
  }, [simDebt, settings.benchmarks.cdi]);

  const amortRows = useMemo(() => {
    if (!amortDebt) return [];
    const fn = amortSystem === "price" ? priceTable : sacTable;
    return fn(amortDebt.balance || amortDebt.originalAmount, amortDebt.annualRate, Math.max(1, amortDebt.totalInstallments - amortDebt.paidInstallments));
  }, [amortDebt, amortSystem]);

  const handleSubmit = () => {
    const validation = validateDebt(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    const data = {
      kind: form.kind,
      creditor: form.creditor.trim(),
      purpose: form.purpose.trim() || undefined,
      originalAmount: Math.round((parseCurrencyInput(form.originalAmount) ?? 0) * 100) / 100,
      balance: Math.round((parseCurrencyInput(form.balance) ?? 0) * 100) / 100,
      annualRate: Number(form.annualRate.replace(",", ".")),
      cet: form.cet.trim() ? Number(form.cet.replace(",", ".")) : null,
      totalInstallments: Number(form.totalInstallments),
      paidInstallments: Number(form.paidInstallments) || 0,
      monthlyPayment: Math.round((parseCurrencyInput(form.monthlyPayment) ?? 0) * 100) / 100,
      dueDay: Number(form.dueDay) || 10,
      startDate: form.startDate,
      note: form.note.trim() || undefined,
      consorcio:
        form.kind === "consorcio"
          ? {
              administrator: form.consorcioAdmin.trim() || "—",
              creditLetter: parseCurrencyInput(form.consorcioLetter) ?? 0,
              adjustmentPct: 0,
              adminFeePct: Number(form.consorcioFee.replace(",", ".")) || 0,
              insurance: 0,
              bid: 0,
              contemplated: false,
            }
          : undefined,
    };
    if (modal.editing) {
      updateDebt(modal.editing.id, data);
      push("success", "Dívida atualizada", data.creditor);
    } else {
      addDebt(data);
      push("success", "Dívida cadastrada", data.creditor);
    }
    setModal({ open: false, editing: null });
  };

  const confirmPayment = () => {
    if (!payTarget) return;
    const amount = parseCurrencyInput(payAmount);
    if (amount === null || amount <= 0) {
      push("error", "Valor inválido", "Informe o valor do pagamento.");
      return;
    }
    addDebtPayment(payTarget.id, { date: todayISO(), amount, kind: payKind });
    push(
      "success",
      payKind === "parcela" ? "Parcela registrada" : "Amortização registrada",
      `${formatBRL(amount)} abatidos de ${payTarget.creditor}.`,
    );
    setPayTarget(null);
  };

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  return (
    <div>
      <PageHeader title="Dívidas e financiamentos" subtitle="Saldo devedor, parcelas e simulações de quitação">
        <Button size="sm" icon={<IconPlus size={15} />} onClick={() => {
          setForm(emptyDebtForm());
          setErrors({});
          setModal({ open: true, editing: null });
        }}>
          Nova dívida
        </Button>
      </PageHeader>

      {status === "loading" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : debts.length === 0 ? (
        <Card className="anim-rise">
          <EmptyState
            icon={<IconCoins size={22} />}
            title="Nenhuma dívida cadastrada"
            description="Registre empréstimos, financiamentos e consórcios para acompanhar saldo e parcelas."
            action={
              <Button icon={<IconPlus size={16} />} onClick={() => setModal({ open: true, editing: null })}>
                Cadastrar dívida
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="anim-rise grid grid-cols-2 divide-x divide-line p-0 sm:grid-cols-3">
            <div className="p-4">
              <p className="text-xs font-semibold text-mut">Saldo devedor total</p>
              <p className="tnum mt-1 font-display text-xl font-bold text-down">{formatBRL(totalBalance)}</p>
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-mut">Parcelas mensais</p>
              <p className="tnum mt-1 font-display text-xl font-bold text-ink">{formatBRL(totalMonthly)}</p>
            </div>
            <div className="col-span-2 p-4 sm:col-span-1">
              <p className="text-xs font-semibold text-mut">Contratos ativos</p>
              <p className="tnum mt-1 font-display text-xl font-bold text-ink">{debts.length}</p>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {debts.map((debt, index) => {
              const progress = debt.totalInstallments > 0 ? debt.paidInstallments / debt.totalInstallments : 0;
              const remaining = Math.max(0, debt.totalInstallments - debt.paidInstallments);
              const paidPct = debt.originalAmount > 0 ? ((debt.originalAmount - debt.balance) / debt.originalAmount) * 100 : 0;
              return (
                <Card key={debt.id} hover className="anim-rise p-5">
                  <div style={{ animationDelay: `${60 + index * 60}ms` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-[15px] font-bold text-ink">{debt.creditor}</h3>
                          <Badge tone={debt.kind === "consorcio" ? "inv" : debt.kind === "financiamento" ? "gold" : "down"}>
                            {DEBT_KINDS.find((k) => k.value === debt.kind)?.label}
                          </Badge>
                        </div>
                        {debt.purpose ? <p className="mt-0.5 text-xs text-mut">{debt.purpose}</p> : null}
                      </div>
                      <div className="flex gap-0.5">
                        <IconButton
                          label={`Editar ${debt.creditor}`}
                          size="sm"
                          onClick={() => {
                            setForm({
                              kind: debt.kind,
                              creditor: debt.creditor,
                              purpose: debt.purpose ?? "",
                              originalAmount: debt.originalAmount.toFixed(2).replace(".", ","),
                              balance: debt.balance.toFixed(2).replace(".", ","),
                              annualRate: String(debt.annualRate).replace(".", ","),
                              cet: debt.cet !== null && debt.cet !== undefined ? String(debt.cet).replace(".", ",") : "",
                              totalInstallments: String(debt.totalInstallments),
                              paidInstallments: String(debt.paidInstallments),
                              monthlyPayment: debt.monthlyPayment.toFixed(2).replace(".", ","),
                              dueDay: String(debt.dueDay),
                              startDate: debt.startDate,
                              note: debt.note ?? "",
                              consorcioAdmin: debt.consorcio?.administrator ?? "",
                              consorcioLetter: debt.consorcio ? String(debt.consorcio.creditLetter) : "",
                              consorcioFee: debt.consorcio ? String(debt.consorcio.adminFeePct).replace(".", ",") : "",
                            });
                            setErrors({});
                            setModal({ open: true, editing: debt });
                          }}
                        >
                          <IconPencil size={15} />
                        </IconButton>
                        <IconButton label={`Excluir ${debt.creditor}`} size="sm" tone="danger" onClick={() => setPendingDelete(debt)}>
                          <IconTrash size={15} />
                        </IconButton>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[11px] font-semibold text-mut">Saldo devedor</p>
                        <p className="tnum font-display text-lg font-bold text-down">{formatBRL(debt.balance)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-mut">Parcela</p>
                        <p className="tnum font-display text-lg font-bold text-ink">{formatBRL(debt.monthlyPayment)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-mut">Juros / CET</p>
                        <p className="tnum font-display text-lg font-bold text-ink">
                          {formatPercent(debt.annualRate, 1)}
                          {debt.cet ? <span className="text-xs text-mut"> / {formatPercent(debt.cet, 1)}</span> : null}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] font-semibold text-mut">
                        <span>{debt.paidInstallments}/{debt.totalInstallments} parcelas pagas</span>
                        <span>{paidPct.toFixed(0)}% quitado</span>
                      </div>
                      <ProgressBar value={progress} color="var(--inv)" className="mt-1.5" />
                    </div>

                    <p className="mt-2 text-[11px] text-mut">
                      Próximo vencimento: {formatDateBR(dayInMonth(currentMonthKey(), debt.dueDay))} · {remaining} restantes
                      {debt.consorcio ? ` · carta de ${formatBRL(debt.consorcio.creditLetter)} (${debt.consorcio.administrator})` : ""}
                    </p>

                    <div className="mt-4 flex gap-2">
                      <Button variant="soft" size="sm" full onClick={() => {
                        setPayTarget(debt);
                        setPayAmount(debt.monthlyPayment.toFixed(2).replace(".", ","));
                        setPayKind("parcela");
                      }} disabled={debt.balance <= 0}>
                        Registrar pagamento
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSimDebt(debt)}>
                        Quitar vs investir
                      </Button>
                      {debt.kind !== "divida" ? (
                        <Button variant="ghost" size="sm" onClick={() => { setAmortDebt(debt); setAmortSystem("price"); }}>
                          Amortização
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal dívida */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? "Editar dívida" : "Nova dívida"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, editing: null })}>Cancelar</Button>
            <Button onClick={handleSubmit}>{modal.editing ? "Salvar" : "Cadastrar"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.2fr]">
            <Field id="debt-kind" label="Tipo">
              <SelectInput id="debt-kind" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as DebtKind }))}>
                {DEBT_KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>{kind.label}</option>
                ))}
              </SelectInput>
            </Field>
            <Field id="debt-creditor" label="Credor" error={errors.creditor}>
              <TextInput id="debt-creditor" value={form.creditor} onChange={(e) => setForm((f) => ({ ...f, creditor: e.target.value }))} placeholder="Ex.: Banco Santander" invalid={Boolean(errors.creditor)} maxLength={60} />
            </Field>
          </div>
          <Field id="debt-purpose" label="Finalidade">
            <TextInput id="debt-purpose" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="Ex.: HB20 2021, reforma…" maxLength={80} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="debt-original" label="Valor original" error={errors.originalAmount}>
              <CurrencyInput id="debt-original" value={form.originalAmount} onValueChange={(v) => setForm((f) => ({ ...f, originalAmount: v }))} invalid={Boolean(errors.originalAmount)} />
            </Field>
            <Field id="debt-balance" label="Saldo devedor atual" error={errors.balance}>
              <CurrencyInput id="debt-balance" value={form.balance} onValueChange={(v) => setForm((f) => ({ ...f, balance: v }))} invalid={Boolean(errors.balance)} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field id="debt-rate" label="Juros (% a.a.)" error={errors.annualRate}>
              <TextInput id="debt-rate" inputMode="decimal" value={form.annualRate} onChange={(e) => setForm((f) => ({ ...f, annualRate: e.target.value }))} placeholder="Ex.: 21,9" invalid={Boolean(errors.annualRate)} />
            </Field>
            <Field id="debt-cet" label="CET (% a.a.)">
              <TextInput id="debt-cet" inputMode="decimal" value={form.cet} onChange={(e) => setForm((f) => ({ ...f, cet: e.target.value }))} placeholder="Opcional" />
            </Field>
            <Field id="debt-payment" label="Parcela mensal" error={errors.monthlyPayment}>
              <CurrencyInput id="debt-payment" value={form.monthlyPayment} onValueChange={(v) => setForm((f) => ({ ...f, monthlyPayment: v }))} invalid={Boolean(errors.monthlyPayment)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field id="debt-total" label="Nº de parcelas" error={errors.totalInstallments}>
              <TextInput id="debt-total" inputMode="numeric" value={form.totalInstallments} onChange={(e) => setForm((f) => ({ ...f, totalInstallments: e.target.value.replace(/\D/g, "") }))} invalid={Boolean(errors.totalInstallments)} />
            </Field>
            <Field id="debt-paid" label="Pagas">
              <TextInput id="debt-paid" inputMode="numeric" value={form.paidInstallments} onChange={(e) => setForm((f) => ({ ...f, paidInstallments: e.target.value.replace(/\D/g, "") }))} />
            </Field>
            <Field id="debt-due" label="Vencimento (dia)">
              <TextInput id="debt-due" inputMode="numeric" value={form.dueDay} onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value.replace(/\D/g, "") }))} />
            </Field>
            <Field id="debt-start" label="Início">
              <TextInput id="debt-start" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </Field>
          </div>
          {form.kind === "consorcio" ? (
            <div className="rounded-xl border border-inv/25 bg-inv/5 p-3.5">
              <p className="text-[13px] font-bold text-ink">Dados do consórcio</p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <Field id="consorcio-admin" label="Administradora">
                  <TextInput id="consorcio-admin" value={form.consorcioAdmin} onChange={(e) => setForm((f) => ({ ...f, consorcioAdmin: e.target.value }))} maxLength={60} />
                </Field>
                <Field id="consorcio-letter" label="Carta de crédito">
                  <CurrencyInput id="consorcio-letter" value={form.consorcioLetter} onValueChange={(v) => setForm((f) => ({ ...f, consorcioLetter: v }))} />
                </Field>
                <Field id="consorcio-fee" label="Taxa adm. (%)">
                  <TextInput id="consorcio-fee" inputMode="decimal" value={form.consorcioFee} onChange={(e) => setForm((f) => ({ ...f, consorcioFee: e.target.value }))} />
                </Field>
              </div>
            </div>
          ) : null}
          <Field id="debt-note" label="Observações">
            <TextInput id="debt-note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} maxLength={120} />
          </Field>
        </div>
      </Modal>

      {/* Modal pagamento */}
      <Modal
        open={payTarget !== null}
        onClose={() => setPayTarget(null)}
        title={`Pagamento — ${payTarget?.creditor ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayTarget(null)}>Cancelar</Button>
            <Button onClick={confirmPayment}>Registrar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field id="dpay-kind" label="Tipo de pagamento">
            <SelectInput id="dpay-kind" value={payKind} onChange={(e) => setPayKind(e.target.value as typeof payKind)}>
              <option value="parcela">Parcela regular</option>
              <option value="amortizacao">Amortização</option>
              <option value="antecipacao">Antecipação</option>
            </SelectInput>
          </Field>
          <Field id="dpay-amount" label="Valor">
            <CurrencyInput id="dpay-amount" value={payAmount} onValueChange={setPayAmount} />
          </Field>
          <p className="text-xs text-mut">
            O saldo devedor será reduzido e o histórico de pagamentos preservado. Para refletir no
            caixa, registre também a saída na conta (Movimentações → Despesa/Transferência).
          </p>
        </div>
      </Modal>

      {/* Simulação quitar vs investir */}
      <Modal
        open={simDebt !== null}
        onClose={() => setSimDebt(null)}
        title={`Quitar vs investir — ${simDebt?.creditor ?? ""}`}
        subtitle="Simulação em 5 anos usando a parcela atual. Nada é alterado nos seus dados."
        size="lg"
        footer={<Button variant="secondary" onClick={() => setSimDebt(null)}>Fechar</Button>}
      >
        {simDebt && simulation ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-up/30 bg-up/5 p-4">
              <p className="text-sm font-bold text-up">Cenário A — quitar antecipado</p>
              <ul className="mt-2 space-y-1 text-[13px] text-ink">
                <li>Dívida zerada em <strong>{simulation.payoff.monthsToZero === Infinity ? "—" : `${simulation.payoff.monthsToZero} meses`}</strong></li>
                <li>Juros evitados: <strong>{formatBRL(simulation.payoff.totalInterest)}</strong></li>
                <li>Patrimônio em 5 anos (parcela liberada investida a {(settings.benchmarks.cdi + 1).toFixed(1)}%): <strong>{formatBRL(simulation.payoff.finalWealth)}</strong></li>
              </ul>
            </div>
            <div className="rounded-xl border border-inv/30 bg-inv/5 p-4">
              <p className="text-sm font-bold text-inv">Cenário B — investir e rolar a dívida</p>
              <ul className="mt-2 space-y-1 text-[13px] text-ink">
                <li>Investimento em 5 anos: <strong>{formatBRL(simulation.invest.finalWealth)}</strong></li>
                <li>Dívida corrigida em 5 anos: <strong className="text-down">{formatBRL(simulation.invest.debtAtEnd)}</strong></li>
                <li>Resultado líquido: <strong>{formatSignedBRL(simulation.invest.finalWealth - simulation.invest.debtAtEnd)}</strong></li>
              </ul>
            </div>
            <p className="rounded-lg border border-line bg-card2/60 p-3 text-xs text-mut sm:col-span-2">
              Regra prática: com dívida a {formatPercent(simDebt.annualRate, 1)} a.a. vs investimento a{" "}
              {(settings.benchmarks.cdi + 1).toFixed(1)}% a.a., quitar antes costuma vencer quando os
              juros da dívida superam o retorno líquido.
            </p>
          </div>
        ) : null}
      </Modal>

      {/* Tabela de amortização */}
      <Modal
        open={amortDebt !== null}
        onClose={() => setAmortDebt(null)}
        title={`Amortização — ${amortDebt?.creditor ?? ""}`}
        subtitle="Tabela do saldo restante (Price ou SAC)."
        size="lg"
        footer={<Button variant="secondary" onClick={() => setAmortDebt(null)}>Fechar</Button>}
      >
        <div className="space-y-3">
          <div className="flex gap-1 rounded-lg border border-line bg-card2 p-1 w-fit">
            {(["price", "sac"] as const).map((system) => (
              <button
                key={system}
                type="button"
                onClick={() => setAmortSystem(system)}
                className={`rounded-md px-4 py-1.5 text-[13px] font-semibold uppercase transition-all ${amortSystem === system ? "border border-line bg-card text-ink shadow-sm" : "text-mut"}`}
              >
                {system}
              </button>
            ))}
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-line">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-card2">
                <tr className="text-[11px] uppercase text-mut">
                  <th className="px-3 py-2 font-semibold">Nº</th>
                  <th className="tnum px-3 py-2 text-right font-semibold">Parcela</th>
                  <th className="tnum px-3 py-2 text-right font-semibold">Juros</th>
                  <th className="tnum px-3 py-2 text-right font-semibold">Amortização</th>
                  <th className="tnum px-3 py-2 text-right font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {amortRows.slice(0, 60).map((row) => (
                  <tr key={row.n}>
                    <td className="px-3 py-1.5 text-mut">{row.n}</td>
                    <td className="tnum px-3 py-1.5 text-right text-ink">{formatBRL(row.payment)}</td>
                    <td className="tnum px-3 py-1.5 text-right text-down">{formatBRL(row.interest)}</td>
                    <td className="tnum px-3 py-1.5 text-right text-up">{formatBRL(row.amortization)}</td>
                    <td className="tnum px-3 py-1.5 text-right font-semibold text-ink">{formatBRL(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-mut">
            Custo total estimado:{" "}
            <strong className="text-ink">{formatBRL(amortRows.reduce((a, r) => a + r.payment, 0))}</strong>{" "}
            (juros de {formatBRL(amortRows.reduce((a, r) => a + r.interest, 0))}). Antecipar parcelas
            finais elimina esses juros.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir dívida"
        message={
          <p>
            Excluir <strong className="text-ink">{pendingDelete?.creditor}</strong> e o histórico de
            pagamentos registrado?
          </p>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            removeDebt(pendingDelete.id);
            push("success", "Dívida excluída", pendingDelete.creditor);
          }
          setPendingDelete(null);
        }}
      />

      <div className="sr-only">
        <SectionHeader title="Dívidas" />
        <IconAlert size={1} />
      </div>
    </div>
  );
}
