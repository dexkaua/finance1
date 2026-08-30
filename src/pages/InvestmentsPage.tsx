import { useMemo, useState, type ReactNode } from "react";
import type { Investment } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import {
  INVESTMENT_TYPES,
  investmentTypeLabel,
} from "../data/categories";
import { formatDateBR } from "../utils/date";
import { allocationByType, investmentSummary } from "../utils/finance";
import { formatBRL, formatBRLCompact, formatPercent, formatSignedBRL } from "../utils/format";
import { Badge, Card, PageHeader, ProgressBar, SectionHeader } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/Modal";
import { InvestmentModal } from "../components/investments/InvestmentModal";
import { DonutChart } from "../components/charts/DonutChart";
import { IconBank, IconPencil, IconPlus, IconTrash, IconTrendUp } from "../components/ui/icons";

export function InvestmentsPage() {
  const { status, investments, deleteInvestment, refresh } = useFinance();
  const { push } = useToast();
  const [modal, setModal] = useState<{ open: boolean; editing: Investment | null }>({
    open: false,
    editing: null,
  });
  const [pendingDelete, setPendingDelete] = useState<Investment | null>(null);

  const summary = useMemo(() => investmentSummary(investments), [investments]);
  const allocation = useMemo(
    () => allocationByType(investments, INVESTMENT_TYPES),
    [investments],
  );
  const sorted = useMemo(
    () => [...investments].sort((a, b) => b.currentValue - a.currentValue),
    [investments],
  );

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  const statTiles: Array<{ label: string; value: string; cls: string; extra?: ReactNode }> = [
    {
      label: "Total investido",
      value: formatBRL(summary.invested),
      cls: "text-ink",
    },
    {
      label: "Valor atual",
      value: formatBRL(summary.current),
      cls: "text-ink",
    },
    {
      label: "Lucro / prejuízo",
      value: formatSignedBRL(summary.profit),
      cls: summary.profit >= 0 ? "text-up" : "text-down",
      extra: (
        <Badge tone={summary.profit >= 0 ? "up" : "down"}>
          {formatPercent(summary.profitPct)} no total
        </Badge>
      ),
    },
    {
      label: "Rentabilidade média",
      value: summary.avgRate !== null ? `${formatPercent(summary.avgRate)} a.a.` : "—",
      cls: "text-inv",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Investimentos"
        subtitle="Sua carteira, posição a posição"
      >
        <Button
          size="sm"
          icon={<IconPlus size={15} />}
          onClick={() => setModal({ open: true, editing: null })}
        >
          Novo investimento
        </Button>
      </PageHeader>

      {status === "loading" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-72" />
          <Skeleton className="h-64" />
        </div>
      ) : investments.length === 0 ? (
        <Card className="anim-rise">
          <EmptyState
            icon={<IconTrendUp size={22} />}
            title="Nenhum investimento cadastrado"
            description="Cadastre suas posições para acompanhar rentabilidade e alocação da carteira."
            action={
              <Button
                icon={<IconPlus size={16} />}
                onClick={() => setModal({ open: true, editing: null })}
              >
                Cadastrar investimento
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statTiles.map((tile, index) => (
              <Card key={tile.label} hover className="anim-rise p-4 sm:p-5" >
                <div style={{ animationDelay: `${index * 60}ms` }}>
                  <p className="text-xs font-semibold text-mut sm:text-[13px]">{tile.label}</p>
                  <p className={`tnum mt-1.5 font-display text-lg font-bold sm:text-xl ${tile.cls}`}>
                    {tile.value}
                  </p>
                  {tile.extra ? <div className="mt-2">{tile.extra}</div> : null}
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-4">
            <Card className="anim-rise col-span-12 p-5 lg:col-span-4" hover>
              <div style={{ animationDelay: "180ms" }}>
                <SectionHeader title="Alocação da carteira" subtitle="Por tipo de ativo" />
                <div className="flex flex-col items-center gap-5">
                  <DonutChart
                    slices={allocation}
                    centerLabel="Carteira"
                    centerValue={formatBRLCompact(summary.current)}
                  />
                  <ul className="w-full space-y-2">
                    {allocation.map((slice) => (
                      <li key={slice.key} className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: slice.color }}
                          />
                          <span className="truncate">{slice.label}</span>
                        </span>
                        <span className="tnum shrink-0 font-semibold text-mut">
                          {formatPercent(slice.pct, 0)}
                          <span className="ml-1.5 hidden text-ink sm:inline">{formatBRLCompact(slice.value)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            <div className="col-span-12 space-y-3 lg:col-span-8">
              {sorted.map((investment, index) => {
                const typeMeta = INVESTMENT_TYPES.find((t) => t.value === investment.type);
                const profit = investment.currentValue - investment.investedAmount;
                const profitPct =
                  investment.investedAmount > 0
                    ? (profit / investment.investedAmount) * 100
                    : 0;
                const share = summary.current > 0 ? (investment.currentValue / summary.current) * 100 : 0;
                return (
                  <Card
                    key={investment.id}
                    hover
                    className="anim-rise p-4 sm:p-5"
                  >
                    <div style={{ animationDelay: `${200 + index * 60}ms` }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-sm"
                              style={{ backgroundColor: typeMeta?.color ?? "#8b949e" }}
                            />
                            <h3 className="font-display text-[15px] font-bold text-ink">
                              {investment.name}
                            </h3>
                            <Badge tone="neutral">{investmentTypeLabel(investment.type)}</Badge>
                            {investment.annualRate !== null ? (
                              <Badge tone="inv">{formatPercent(investment.annualRate)} a.a.</Badge>
                            ) : (
                              <Badge tone="gold">Renda variável</Badge>
                            )}
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-mut">
                            <IconBank size={13} />
                            {investment.institution} · desde {formatDateBR(investment.startDate)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <IconButton
                            label={`Editar ${investment.name}`}
                            size="sm"
                            onClick={() => setModal({ open: true, editing: investment })}
                          >
                            <IconPencil size={15} />
                          </IconButton>
                          <IconButton
                            label={`Excluir ${investment.name}`}
                            size="sm"
                            tone="danger"
                            onClick={() => setPendingDelete(investment)}
                          >
                            <IconTrash size={15} />
                          </IconButton>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-mut">
                            Investido
                          </p>
                          <p className="tnum mt-0.5 text-sm font-bold text-ink">
                            {formatBRL(investment.investedAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-mut">
                            Valor atual
                          </p>
                          <p className="tnum mt-0.5 text-sm font-bold text-ink">
                            {formatBRL(investment.currentValue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-mut">
                            Lucro / prejuízo
                          </p>
                          <p
                            className={`tnum mt-0.5 text-sm font-bold ${
                              profit >= 0 ? "text-up" : "text-down"
                            }`}
                          >
                            {formatSignedBRL(profit)}
                            <span className="ml-1 text-[11px] font-semibold">
                              ({formatSignedBRL(profit).startsWith("+") ? "+" : "−"}
                              {formatPercent(Math.abs(profitPct))})
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-mut">
                            % da carteira
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <ProgressBar
                              value={share / 100}
                              color={typeMeta?.color ?? "var(--inv)"}
                              thickness="h-1.5"
                              className="flex-1"
                            />
                            <span className="tnum text-[11px] font-bold text-mut">
                              {formatPercent(share, 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <InvestmentModal
        open={modal.open}
        editing={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir investimento"
        message={
          <p>
            Excluir <strong className="text-ink">“{pendingDelete?.name}”</strong> remove a posição
            e seus cálculos de carteira. Essa ação não pode ser desfeita.
          </p>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteInvestment(pendingDelete.id);
            push("success", "Investimento excluído", pendingDelete.name);
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
