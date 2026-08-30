import { useMemo } from "react";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { checkDataQuality, computeScore } from "../utils/finance";
import { formatBRL } from "../utils/format";
import { Badge, Card, PageHeader, ProgressBar, SectionHeader } from "../components/ui/Display";
import { ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button } from "../components/ui/Button";
import { IconAlert, IconCheck, IconCoins } from "../components/ui/icons";

export function HealthPage() {
  const { status, appData, updateSettings, fixTransactionAccount, cancelTransaction, refresh } = useFinance();
  const { push } = useToast();

  const score = useMemo(() => (status === "ready" ? computeScore(appData) : null), [status, appData]);
  const issues = useMemo(() => (status === "ready" ? checkDataQuality(appData) : []), [status, appData]);

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  const scoreColor = score ? (score.score >= 70 ? "var(--up)" : score.score >= 45 ? "var(--gold)" : "var(--down)") : "var(--mut)";
  const errors = issues.filter((issue) => issue.severity === "erro");
  const warnings = issues.filter((issue) => issue.severity !== "erro");

  return (
    <div>
      <PageHeader title="Saúde financeira" subtitle="Score transparente + verificador automático da qualidade dos dados" />

      {status === "loading" || !score ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="anim-rise relative overflow-hidden p-6">
            <div className="dotgrid pointer-events-none absolute inset-0 opacity-40" />
            <div className="relative flex flex-wrap items-center gap-6">
              <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="color-mix(in oklab, var(--ink) 8%, transparent)" strokeWidth="11" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray={`${(score.score / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="text-center">
                  <p className="tnum font-display text-4xl font-bold text-ink">{score.score}</p>
                  <p className="text-[11px] font-semibold text-mut">/ 100</p>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-bold text-ink">
                  {score.score >= 70 ? "Situação saudável" : score.score >= 45 ? "Atenção em alguns pontos" : "Situação crítica"}
                </h2>
                {score.delta !== null && score.delta !== 0 ? (
                  <p className="mt-1 text-sm text-mut">
                    Score {score.delta > 0 ? "subiu" : "caiu"} de{" "}
                    <strong className="text-ink">{(appData.settings.lastScore ?? 0)}</strong> para{" "}
                    <strong className="text-ink">{score.score}</strong>{" "}
                    {score.delta < 0 ? "— revise os fatores com menor pontuação abaixo." : "— bom trabalho."}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-mut">
                    O score é recalculado a cada visita com base nos seus dados reais.
                  </p>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => {
                    updateSettings({ lastScore: score.score });
                    push("success", "Referência salva", `Próxima visita comparará contra ${score.score}.`);
                  }}
                >
                  Salvar como referência
                </Button>
              </div>
            </div>
          </Card>

          <Card className="anim-rise p-5">
            <div style={{ animationDelay: "80ms" }}>
              <SectionHeader title="Fatores do score" subtitle="Cálculo transparente — cada fator com peso e detalhe" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {score.factors.map((factor) => (
                  <div key={factor.key} className="rounded-xl border border-line bg-card2/50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{factor.label}</p>
                      <span className="tnum font-display text-base font-bold" style={{ color: factor.score >= 70 ? "var(--up)" : factor.score >= 45 ? "var(--gold)" : "var(--down)" }}>
                        {Math.round(factor.score)}
                      </span>
                    </div>
                    <ProgressBar
                      value={factor.score / 100}
                      color={factor.score >= 70 ? "var(--up)" : factor.score >= 45 ? "var(--gold)" : "var(--down)"}
                      className="mt-2"
                      thickness="h-1.5"
                    />
                    <p className="mt-2 text-[11px] text-mut">
                      {factor.detail} · peso {factor.weight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="anim-rise p-5">
            <div style={{ animationDelay: "140ms" }}>
              <SectionHeader
                title="Controle de qualidade dos dados"
                subtitle={
                  issues.length === 0
                    ? "Nenhuma inconsistência encontrada"
                    : `${issues.length} inconsistência${issues.length > 1 ? "s" : ""} encontrada${issues.length > 1 ? "s" : ""} — ${errors.length} erro(s), ${warnings.length} aviso(s)`
                }
              />
              {issues.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-up/30 bg-up/5 p-4">
                  <IconCheck size={22} className="text-up" />
                  <p className="text-sm font-semibold text-up">
                    Tudo íntegro: contas válidas, sem duplicidades, parcelas consistentes e limites ok.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {issues.map((issue) => (
                    <li key={issue.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card2/50 px-4 py-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className={`mt-0.5 shrink-0 ${issue.severity === "erro" ? "text-down" : issue.severity === "aviso" ? "text-gold" : "text-inv"}`}>
                          <IconAlert size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                            {issue.title}
                            <Badge tone={issue.severity === "erro" ? "down" : issue.severity === "aviso" ? "gold" : "inv"}>
                              {issue.severity}
                            </Badge>
                          </p>
                          <p className="mt-0.5 text-[13px] text-mut">{issue.detail}</p>
                        </div>
                      </div>
                      {issue.fixLabel && issue.refs?.txId ? (
                        <Button
                          size="sm"
                          variant={issue.severity === "erro" ? "danger" : "secondary"}
                          onClick={() => {
                            const txId = issue.refs?.txId;
                            const accountId = issue.refs?.accountId;
                            if (!txId) return;
                            if (issue.fixLabel?.includes("Vincular") && accountId) {
                              fixTransactionAccount(txId, accountId);
                              push("success", "Corrigido", "Movimentação vinculada à conta principal.");
                            } else {
                              cancelTransaction(txId, "Cancelado pelo verificador de qualidade");
                              push("success", "Corrigido", "Lançamento cancelado (permanece no histórico).");
                            }
                          }}
                        >
                          {issue.fixLabel}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <p className="flex items-center gap-2 text-[11px] text-mut">
            <IconCoins size={13} />
            Verificações: movimentação sem conta · duplicidades · transferência sem destino · parcelas
            inconsistentes · limite estourado · investimento sem instituição/valor · e mais.
            Valores em {formatBRL(0).replace(/[\d.,\s−-]/g, "") || "R$"}.
          </p>
        </div>
      )}
    </div>
  );
}
