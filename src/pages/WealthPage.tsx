import { useMemo, useState } from "react";
import type { Asset, AssetType } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { ASSET_TYPES } from "../data/categories";
import { lastMonthKeys } from "../utils/date";
import { accountBalance, cardLimitUsed, wealthSeries, wealthSnapshot } from "../utils/finance";
import { formatBRL, formatPercent, formatSignedBRL, parseCurrencyInput } from "../utils/format";
import { Badge, Card, PageHeader, SectionHeader, ProgressBar } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { CurrencyInput, Field, SelectInput, TextInput } from "../components/ui/FormControls";
import { WealthChart } from "../components/charts/WealthChart";
import { DonutChart } from "../components/charts/DonutChart";
import { IconCoins, IconPencil, IconPlus, IconTrash, IconWallet, IconTrendUp } from "../components/ui/icons";

interface AssetForm {
  name: string;
  type: AssetType;
  value: string;
  purchaseValue: string;
  purchaseDate: string;
  note: string;
}

export function WealthPage() {
  const {
    status,
    accounts,
    investments,
    assets,
    debts,
    cards,
    transactions,
    invoiceExtras,
    invoicePayments,
    addAsset,
    updateAsset,
    removeAsset,
    refresh,
  } = useFinance();
  const { push } = useToast();
  const [modal, setModal] = useState<{ open: boolean; editing: Asset | null }>({ open: false, editing: null });
  const [form, setForm] = useState<AssetForm>({ name: "", type: "carro", value: "", purchaseValue: "", purchaseDate: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null);

  const snapshot = useMemo(
    () =>
      wealthSnapshot(accounts, investments, assets, debts, cards, transactions, invoiceExtras, invoicePayments),
    [accounts, investments, assets, debts, cards, transactions, invoiceExtras, invoicePayments],
  );

  const series = useMemo(
    () => wealthSeries(accounts, investments, assets, transactions, lastMonthKeys(12)),
    [accounts, investments, assets, transactions],
  );

  const yearly = useMemo(() => {
    const map = new Map<string, { last: number; first: number | null }>();
    for (const point of series) {
      // série mensal — agrupa por ano para a linha do tempo
    }
    const byYear = new Map<string, number>();
    for (const point of series) {
      const year = `20${point.label.split("/")[1]}`;
      byYear.set(year, point.patrimonio);
    }
    return Array.from(byYear.entries()).map(([year, value]) => ({ year, value }));
  }, [series]);

  const cardLiability = useMemo(
    () => cards.reduce((acc, card) => acc + cardLimitUsed(card, transactions, invoiceExtras, invoicePayments), 0),
    [cards, transactions, invoiceExtras, invoicePayments],
  );
  const debtLiability = useMemo(() => debts.reduce((a, d) => a + Math.max(0, d.balance), 0), [debts]);

  const distribution = useMemo(
    () =>
      [
        { key: "contas", label: "Contas", value: snapshot.accounts, color: "#2b8560" },
        { key: "investimentos", label: "Investimentos", value: snapshot.investments, color: "#2d69a8" },
        { key: "bens", label: "Bens", value: snapshot.goods, color: "#d9a441" },
      ]
        .map((slice) => ({ ...slice, pct: snapshot.grossAssets > 0 ? (slice.value / snapshot.grossAssets) * 100 : 0 }))
        .filter((slice) => slice.value > 0),
    [snapshot],
  );

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Informe o nome do bem.";
    const value = parseCurrencyInput(form.value);
    if (value === null || value <= 0) errs.value = "Informe o valor atual.";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const data = {
      name: form.name.trim(),
      type: form.type,
      value: Math.round((value ?? 0) * 100) / 100,
      purchaseValue: parseCurrencyInput(form.purchaseValue) ?? undefined,
      purchaseDate: form.purchaseDate || undefined,
      note: form.note.trim() || undefined,
    };
    if (modal.editing) {
      updateAsset(modal.editing.id, data);
      push("success", "Bem atualizado", data.name);
    } else {
      addAsset(data);
      push("success", "Bem adicionado", data.name);
    }
    setModal({ open: false, editing: null });
  };

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  return (
    <div>
      <PageHeader
        title="Patrimônio"
        subtitle="Ativos financeiros, bens e passivos — líquido sempre derivado"
      >
        <Button size="sm" icon={<IconPlus size={15} />} onClick={() => {
          setForm({ name: "", type: "carro", value: "", purchaseValue: "", purchaseDate: "", note: "" });
          setErrors({});
          setModal({ open: true, editing: null });
        }}>
          Adicionar bem
        </Button>
      </PageHeader>

      {status === "loading" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Patrimônio líquido em destaque */}
          <Card className="anim-rise relative overflow-hidden p-5 sm:p-6">
            <div className="dotgrid pointer-events-none absolute inset-0 opacity-40" />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-mut">Patrimônio líquido</p>
                <p className="tnum mt-1 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                  {formatBRL(snapshot.netWorth)}
                </p>
                <p className="mt-2 text-[13px] text-mut">
                  Bruto {formatBRL(snapshot.grossAssets)} − passivos {formatBRL(snapshot.liabilities)}
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs font-semibold text-mut">Ativos financeiros</p>
                  <p className="tnum font-display text-lg font-bold text-up">{formatBRL(snapshot.financialAssets)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-mut">Bens</p>
                  <p className="tnum font-display text-lg font-bold text-gold">{formatBRL(snapshot.goods)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-mut">Passivos</p>
                  <p className="tnum font-display text-lg font-bold text-down">{formatBRL(snapshot.liabilities)}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Contas */}
            <Card className="anim-rise p-5" hover>
              <div style={{ animationDelay: "60ms" }}>
                <SectionHeader title="Contas" subtitle="Separadas de investimentos" />
                <ul className="space-y-2.5">
                  {accounts.map((account) => (
                    <li key={account.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <IconWallet size={15} className="text-up" /> {account.institution}
                      </span>
                      <span className="tnum font-bold text-ink">{formatBRL(accountBalance(account, transactions))}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-dashed border-line pt-2 text-right text-sm font-bold text-ink">
                  {formatBRL(snapshot.accounts)}
                </p>
              </div>
            </Card>

            {/* Investimentos */}
            <Card className="anim-rise p-5" hover>
              <div style={{ animationDelay: "100ms" }}>
                <SectionHeader title="Investimentos" subtitle="Valor atual das posições" />
                <ul className="space-y-2.5">
                  {investments
                    .slice()
                    .sort((a, b) => b.currentValue - a.currentValue)
                    .slice(0, 5)
                    .map((inv) => (
                      <li key={inv.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium text-ink">{inv.name}</span>
                        <span className="tnum font-bold text-ink">{formatBRL(inv.currentValue)}</span>
                      </li>
                    ))}
                </ul>
                <p className="mt-3 border-t border-dashed border-line pt-2 text-right text-sm font-bold text-ink">
                  {formatBRL(snapshot.investments)}
                  {investments.length > 5 ? <span className="ml-1 text-xs font-medium text-mut">+{investments.length - 5}</span> : null}
                </p>
              </div>
            </Card>

            {/* Passivos */}
            <Card className="anim-rise p-5" hover>
              <div style={{ animationDelay: "140ms" }}>
                <SectionHeader title="Passivos" subtitle="Dívidas + faturas em aberto" />
                <ul className="space-y-2.5">
                  {debts.map((debt) => (
                    <li key={debt.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-ink">{debt.creditor}</span>
                      <span className="tnum font-bold text-down">{formatBRL(debt.balance)}</span>
                    </li>
                  ))}
                  {cardLiability > 0 ? (
                    <li className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-ink">Faturas de cartão</span>
                      <span className="tnum font-bold text-down">{formatBRL(cardLiability)}</span>
                    </li>
                  ) : null}
                </ul>
                <p className="mt-3 border-t border-dashed border-line pt-2 text-right text-sm font-bold text-down">
                  {formatBRL(snapshot.liabilities)}
                </p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <Card className="anim-rise p-5">
              <div style={{ animationDelay: "180ms" }}>
                <SectionHeader title="Evolução patrimonial" subtitle="Últimos 12 meses" />
                <WealthChart
                  data={series.map((point) => ({ label: point.label, patrimonio: point.patrimonio }))}
                  height={260}
                />
              </div>
            </Card>
            <Card className="anim-rise p-5" hover>
              <div style={{ animationDelay: "220ms" }}>
                <SectionHeader title="Distribuição" subtitle="Do patrimônio bruto" />
                <div className="flex flex-col items-center">
                  <DonutChart
                    slices={distribution}
                    centerLabel="Bruto"
                    centerValue={formatBRL(snapshot.grossAssets).replace(/\s/g, "")}
                  />
                  <ul className="mt-2 w-full space-y-1.5">
                    {distribution.map((slice) => (
                      <li key={slice.key} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-ink">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: slice.color }} />
                          {slice.label}
                        </span>
                        <span className="tnum text-mut">{formatPercent(slice.pct, 0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Bens */}
          <Card className="anim-rise overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3">
              <SectionHeader title="Bens" subtitle="Carro, imóvel, eletrônicos…" />
            </div>
            {assets.length === 0 ? (
              <EmptyState
                compact
                icon={<IconCoins size={20} />}
                title="Nenhum bem cadastrado"
                description="Bens entram no patrimônio bruto, mas não na liquidez."
              />
            ) : (
              <ul className="divide-y divide-line">
                {assets.map((asset) => {
                  const depreciation =
                    asset.purchaseValue && asset.purchaseValue > 0
                      ? ((asset.value - asset.purchaseValue) / asset.purchaseValue) * 100
                      : null;
                  return (
                    <li key={asset.id} className="group flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                          {asset.name}
                          <Badge tone="neutral">{ASSET_TYPES.find((t) => t.value === asset.type)?.label}</Badge>
                        </p>
                        <p className="text-[11px] text-mut">
                          {asset.purchaseValue ? `comprado por ${formatBRL(asset.purchaseValue)}` : "valor de mercado"}
                          {depreciation !== null ? (
                            <span className={depreciation >= 0 ? "text-up" : "text-down"}>
                              {" "}· {formatSignedBRL(asset.value - (asset.purchaseValue ?? 0))} ({formatPercent(depreciation, 0)})
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tnum font-display text-base font-bold text-ink">{formatBRL(asset.value)}</span>
                        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <IconButton
                            label={`Editar ${asset.name}`}
                            size="sm"
                            onClick={() => {
                              setForm({
                                name: asset.name,
                                type: asset.type,
                                value: asset.value.toFixed(2).replace(".", ","),
                                purchaseValue: asset.purchaseValue !== undefined ? asset.purchaseValue.toFixed(2).replace(".", ",") : "",
                                purchaseDate: asset.purchaseDate ?? "",
                                note: asset.note ?? "",
                              });
                              setErrors({});
                              setModal({ open: true, editing: asset });
                            }}
                          >
                            <IconPencil size={15} />
                          </IconButton>
                          <IconButton label={`Excluir ${asset.name}`} size="sm" tone="danger" onClick={() => setPendingDelete(asset)}>
                            <IconTrash size={15} />
                          </IconButton>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Linha do tempo */}
          <Card className="anim-rise p-5">
            <div style={{ animationDelay: "260ms" }}>
              <SectionHeader title="Linha do tempo" subtitle="Patrimônio ao longo dos anos" />
              <ol className="relative ml-2 space-y-4 border-l-2 border-pine-500/30 pl-5">
                {yearly.map((point, index) => (
                  <li key={point.year} className="relative">
                    <span
                      className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-card bg-pine-500"
                      style={{ animationDelay: `${index * 80}ms` }}
                    />
                    <p className="font-display text-sm font-bold text-ink">{point.year}</p>
                    <p className="tnum text-[13px] font-semibold text-mut">
                      Patrimônio: <strong className="text-ink">{formatBRL(point.value)}</strong>
                      {index > 0 ? (
                        <span className={`ml-2 ${point.value >= yearly[index - 1].value ? "text-up" : "text-down"}`}>
                          {formatSignedBRL(point.value - yearly[index - 1].value)}
                        </span>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        </div>
      )}

      {/* Modal bem */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? "Editar bem" : "Novo bem"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, editing: null })}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>{modal.editing ? "Salvar" : "Adicionar"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field id="asset-name" label="Nome" error={errors.name}>
            <TextInput id="asset-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: HB20 2021" invalid={Boolean(errors.name)} maxLength={60} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="asset-type" label="Tipo">
              <SelectInput id="asset-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AssetType }))}>
                {ASSET_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </SelectInput>
            </Field>
            <Field id="asset-value" label="Valor atual" error={errors.value}>
              <CurrencyInput id="asset-value" value={form.value} onValueChange={(value) => setForm((f) => ({ ...f, value }))} invalid={Boolean(errors.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="asset-purchase-value" label="Valor de compra">
              <CurrencyInput id="asset-purchase-value" value={form.purchaseValue} onValueChange={(value) => setForm((f) => ({ ...f, purchaseValue: value }))} />
            </Field>
            <Field id="asset-purchase-date" label="Data de compra">
              <TextInput id="asset-purchase-date" type="date" value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} />
            </Field>
          </div>
          <Field id="asset-note" label="Observações">
            <TextInput id="asset-note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} maxLength={120} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir bem"
        message={
          <p>
            Excluir <strong className="text-ink">{pendingDelete?.name}</strong> do patrimônio?
          </p>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            removeAsset(pendingDelete.id);
            push("success", "Bem excluído", pendingDelete.name);
          }
          setPendingDelete(null);
        }}
      />

      <div className="sr-only">
        <IconTrendUp size={1} />
        <ProgressBar value={0} />
      </div>
    </div>
  );
}
