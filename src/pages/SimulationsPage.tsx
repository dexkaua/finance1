import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFinance } from "../contexts/FinanceContext";
import { debtVsInvest, projectFire, projectInvestment, projectRetirement, requiredMonthly } from "../utils/simulations";
import { formatBRL, formatPercent, parseCurrencyInput } from "../utils/format";
import { Card, PageHeader, SectionHeader } from "../components/ui/Display";
import { Field, TextInput } from "../components/ui/FormControls";
import { ChartTooltip } from "../components/charts/ChartTooltip";

type Tab = "universal" | "independencia" | "aposentadoria" | "divida";

function NumField({
  id,
  label,
  value,
  onChange,
  suffix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <Field id={id} label={label}>
      <div className="relative">
        <TextInput id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={suffix ? "pr-12" : ""} />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-mut">
            {suffix}
          </span>
        ) : null}
      </div>
    </Field>
  );
}

function ResultTile({ label, value, accent }: { label: string; value: string; accent?: "up" | "down" | "inv" }) {
  return (
    <div className="rounded-xl border border-line bg-card2/60 p-3.5">
      <p className="text-[11px] font-semibold text-mut">{label}</p>
      <p className={`tnum mt-1 font-display text-base font-bold sm:text-lg ${accent === "up" ? "text-up" : accent === "down" ? "text-down" : accent === "inv" ? "text-inv" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}

const axisFormatter = (value: number) => (Math.abs(value) >= 1000 ? `${Math.round(value / 1000)}k` : String(value));

export function SimulationsPage() {
  const { appData, settings } = useFinance();
  const [tab, setTab] = useState<Tab>("universal");

  // Universal
  const [uInitial, setUInitial] = useState("10000");
  const [uMonthly, setUMonthly] = useState("600");
  const [uYears, setUYears] = useState("20");
  const [uRate, setURate] = useState(String(settings.benchmarks.cdi + 1).replace(".", ","));
  const [uInflation, setUInflation] = useState(String(settings.benchmarks.ipca).replace(".", ","));

  const universal = useMemo(() => {
    const result = projectInvestment({
      initial: parseCurrencyInput(uInitial) ?? 0,
      monthly: parseCurrencyInput(uMonthly) ?? 0,
      years: Number(uYears.replace(",", ".")) || 0,
      annualRatePct: Number(uRate.replace(",", ".")) || 0,
      inflationPct: Number(uInflation.replace(",", ".")) || 0,
    });
    const pessimistic = projectInvestment({
      initial: parseCurrencyInput(uInitial) ?? 0,
      monthly: parseCurrencyInput(uMonthly) ?? 0,
      years: Number(uYears.replace(",", ".")) || 0,
      annualRatePct: Math.max(0, (Number(uRate.replace(",", ".")) || 0) - 2),
      inflationPct: Number(uInflation.replace(",", ".")) || 0,
    });
    const optimistic = projectInvestment({
      initial: parseCurrencyInput(uInitial) ?? 0,
      monthly: parseCurrencyInput(uMonthly) ?? 0,
      years: Number(uYears.replace(",", ".")) || 0,
      annualRatePct: (Number(uRate.replace(",", ".")) || 0) + 2,
      inflationPct: Number(uInflation.replace(",", ".")) || 0,
    });
    return { result, pessimistic, optimistic };
  }, [uInitial, uMonthly, uYears, uRate, uInflation]);

  const chartData = useMemo(
    () =>
      universal.result.series.map((point, index) => ({
        label: point.label,
        base: Math.round(point.nominal),
        pessimista: Math.round(universal.pessimistic.series[index]?.nominal ?? 0),
        otimista: Math.round(universal.optimistic.series[index]?.nominal ?? 0),
        aportado: Math.round(point.contributed),
      })),
    [universal],
  );

  // FIRE
  const [fAge, setFAge] = useState("30");
  const [fInvested, setFInvested] = useState(String(Math.round(appData ? 0 : 0) || "50000"));
  const [fExpenses, setFExpenses] = useState("5000");
  const [fContribution, setFContribution] = useState("1000");
  const [fReturn, setFReturn] = useState(String(settings.benchmarks.cdi + 1).replace(".", ","));
  const [fInfl, setFInfl] = useState(String(settings.benchmarks.ipca).replace(".", ","));
  const [fSwr, setFSwr] = useState("4");

  const fire = useMemo(
    () =>
      projectFire({
        currentAge: Number(fAge) || 30,
        invested: parseCurrencyInput(fInvested) ?? 0,
        monthlyExpenses: parseCurrencyInput(fExpenses) ?? 0,
        monthlyContribution: parseCurrencyInput(fContribution) ?? 0,
        annualReturnPct: Number(fReturn.replace(",", ".")) || 0,
        inflationPct: Number(fInfl.replace(",", ".")) || 0,
        withdrawalRatePct: Number(fSwr.replace(",", ".")) || 4,
        maxAge: 70,
      }),
    [fAge, fInvested, fExpenses, fContribution, fReturn, fInfl, fSwr],
  );

  const fireScenarios = useMemo(() => {
    const base = Number(fContribution.replace(/\./g, "").replace(",", ".")) || 0;
    return [100, 500, 1000, base].filter((v, i, arr) => arr.indexOf(v) === i).map((value) => {
      const result = projectFire({
        currentAge: Number(fAge) || 30,
        invested: parseCurrencyInput(fInvested) ?? 0,
        monthlyExpenses: parseCurrencyInput(fExpenses) ?? 0,
        monthlyContribution: value,
        annualReturnPct: Number(fReturn.replace(",", ".")) || 0,
        inflationPct: Number(fInfl.replace(",", ".")) || 0,
        withdrawalRatePct: Number(fSwr.replace(",", ".")) || 4,
        maxAge: 70,
      });
      return { value, age: result.fireAge };
    });
  }, [fAge, fInvested, fExpenses, fContribution, fReturn, fInfl, fSwr]);

  // Aposentadoria
  const [rAge, setRAge] = useState("30");
  const [rRetire, setRRetire] = useState("60");
  const [rInvested, setRInvested] = useState("50000");
  const [rMonthly, setRMonthly] = useState("800");
  const [rIncome, setRIncome] = useState("6000");
  const [rLife, setRLife] = useState("90");

  const retirement = useMemo(
    () =>
      projectRetirement({
        currentAge: Number(rAge) || 30,
        invested: parseCurrencyInput(rInvested) ?? 0,
        monthlyContribution: parseCurrencyInput(rMonthly) ?? 0,
        desiredMonthlyIncome: parseCurrencyInput(rIncome) ?? 0,
        annualReturnPct: Number(fReturn.replace(",", ".")) || 0,
        inflationPct: Number(fInfl.replace(",", ".")) || 0,
        retirementAge: Number(rRetire) || 60,
        lifeExpectancy: Number(rLife) || 90,
      }),
    [rAge, rRetire, rInvested, rMonthly, rIncome, rLife, fReturn, fInfl],
  );

  // Dívida vs investir
  const [dBalance, setDBalance] = useState("30000");
  const [dRate, setDRate] = useState("21,9");
  const [dPayment, setDPayment] = useState("1480");

  const debtSim = useMemo(
    () =>
      debtVsInvest({
        debtBalance: parseCurrencyInput(dBalance) ?? 0,
        debtAnnualRatePct: Number(dRate.replace(",", ".")) || 0,
        monthlyPayment: parseCurrencyInput(dPayment) ?? 0,
        investAnnualRatePct: settings.benchmarks.cdi + 1,
        horizonYears: 5,
      }),
    [dBalance, dRate, dPayment, settings.benchmarks.cdi],
  );

  return (
    <div>
      <PageHeader title="Laboratório financeiro" subtitle="Simulações que NUNCA alteram seus dados reais" />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-line bg-card2 p-1">
        {(
          [
            ["universal", "Simulador universal"],
            ["independencia", "Independência financeira"],
            ["aposentadoria", "Aposentadoria"],
            ["divida", "Quitar vs investir"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-md px-4 py-1.5 text-[13px] font-semibold transition-all ${tab === key ? "border border-line bg-card text-ink shadow-sm" : "text-mut hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "universal" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          <Card className="anim-rise p-5">
            <SectionHeader title="Parâmetros" subtitle="Capitalização composta mensal" />
            <div className="space-y-3">
              <NumField id="u-initial" label="Capital inicial" value={uInitial} onChange={setUInitial} suffix="R$" />
              <NumField id="u-monthly" label="Aporte mensal" value={uMonthly} onChange={setUMonthly} suffix="R$" />
              <NumField id="u-years" label="Prazo" value={uYears} onChange={setUYears} suffix="anos" />
              <NumField id="u-rate" label="Rentabilidade nominal" value={uRate} onChange={setURate} suffix="% a.a." />
              <NumField id="u-infl" label="Inflação" value={uInflation} onChange={setUInflation} suffix="% a.a." />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ResultTile label="Valor nominal" value={formatBRL(universal.result.nominal)} accent="up" />
              <ResultTile label="Valor real" value={formatBRL(universal.result.real)} accent="inv" />
              <ResultTile label="Total aportado" value={formatBRL(universal.result.contributed)} />
              <ResultTile label="Juros acumulados" value={formatBRL(universal.result.interest)} accent="up" />
            </div>
          </Card>
          <Card className="anim-rise p-5">
            <div style={{ animationDelay: "80ms" }}>
              <SectionHeader title="Crescimento" subtitle="Cenários pessimista (−2 p.p.), base e otimista (+2 p.p.)" />
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="simFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2b8560" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#2b8560" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 6" />
                    <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--line)" }} tick={{ fill: "var(--mut)", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--mut)", fontSize: 11 }} tickFormatter={axisFormatter} width={44} />
                    <Tooltip content={<ChartTooltip names={{ otimista: "Otimista", base: "Base", pessimista: "Pessimista", aportado: "Aportado" }} />} />
                    <Area type="monotone" dataKey="otimista" stroke="#7fbda0" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
                    <Area type="monotone" dataKey="base" stroke="#2b8560" strokeWidth={2.5} fill="url(#simFill)" />
                    <Area type="monotone" dataKey="pessimista" stroke="#c96f4a" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
                    <Area type="monotone" dataKey="aportado" stroke="var(--mut)" strokeWidth={1.5} strokeDasharray="2 4" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "independencia" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          <Card className="anim-rise p-5">
            <SectionHeader title="Sua situação" subtitle="Regra de retirada configurável (padrão 4%)" />
            <div className="grid grid-cols-2 gap-3">
              <NumField id="f-age" label="Idade atual" value={fAge} onChange={setFAge} />
              <NumField id="f-invested" label="Patrimônio investido" value={fInvested} onChange={setFInvested} suffix="R$" />
              <NumField id="f-expenses" label="Despesas/mês" value={fExpenses} onChange={setFExpenses} suffix="R$" />
              <NumField id="f-contribution" label="Aporte/mês" value={fContribution} onChange={setFContribution} suffix="R$" />
              <NumField id="f-return" label="Retorno real bruto" value={fReturn} onChange={setFReturn} suffix="% a.a." />
              <NumField id="f-infl" label="Inflação" value={fInfl} onChange={setFInfl} suffix="% a.a." />
              <NumField id="f-swr" label="Taxa de retirada" value={fSwr} onChange={setFSwr} suffix="%" />
            </div>
            <div className="mt-4 space-y-2">
              <ResultTile label="Número da independência" value={formatBRL(fire.fireNumber)} accent="inv" />
              <ResultTile
                label="Idade projetada de independência"
                value={fire.fireAge !== null ? `${fire.fireAge} anos` : "além dos 70 com os parâmetros atuais"}
                accent={fire.fireAge !== null ? "up" : "down"}
              />
            </div>
          </Card>
          <Card className="anim-rise p-5">
            <div style={{ animationDelay: "80ms" }}>
              <SectionHeader title="Comparação de aportes" subtitle="Idade de independência conforme o aporte mensal" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {fireScenarios.map((scenario) => (
                  <div key={scenario.value} className="rounded-xl border border-line bg-card2/60 p-4 text-center">
                    <p className="tnum text-sm font-bold text-ink">{formatBRL(scenario.value)}/mês</p>
                    <p className={`mt-1 font-display text-lg font-bold ${scenario.age !== null ? "text-up" : "text-down"}`}>
                      {scenario.age !== null ? `${scenario.age} anos` : "70+"}
                    </p>
                  </div>
                ))}
              </div>
              <div style={{ height: 260 }} className="mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fire.series} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 6" />
                    <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--line)" }} tick={{ fill: "var(--mut)", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--mut)", fontSize: 11 }} tickFormatter={axisFormatter} width={44} />
                    <Tooltip content={<ChartTooltip names={{ patrimonio: "Patrimônio", meta: "Meta FI" }} />} />
                    <Area type="monotone" dataKey="meta" stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="5 5" fill="none" />
                    <Area type="monotone" dataKey="patrimonio" stroke="#2b8560" strokeWidth={2.5} fill="url(#simFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "aposentadoria" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          <Card className="anim-rise p-5">
            <SectionHeader title="Parâmetros" subtitle="Patrimônio próprio + previdência" />
            <div className="grid grid-cols-2 gap-3">
              <NumField id="r-age" label="Idade atual" value={rAge} onChange={setRAge} />
              <NumField id="r-retire" label="Aposentar aos" value={rRetire} onChange={setRRetire} />
              <NumField id="r-invested" label="Já acumulado" value={rInvested} onChange={setRInvested} suffix="R$" />
              <NumField id="r-monthly" label="Aporte/mês" value={rMonthly} onChange={setRMonthly} suffix="R$" />
              <NumField id="r-income" label="Renda mensal desejada" value={rIncome} onChange={setRIncome} suffix="R$" />
              <NumField id="r-life" label="Expectativa de vida" value={rLife} onChange={setRLife} />
            </div>
          </Card>
          <Card className="anim-rise p-5">
            <div style={{ animationDelay: "80ms" }}>
              <SectionHeader title="Projeção" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <ResultTile label="Patrimônio na aposentadoria" value={formatBRL(retirement.projectedAtRetirement)} accent="up" />
                <ResultTile label="Renda sustentável (30 anos)" value={`${formatBRL(retirement.sustainableMonthly)}/mês`} accent="inv" />
                <ResultTile
                  label="Patrimônio dura até"
                  value={retirement.lastsUntilAge !== null ? `${Math.floor(retirement.lastsUntilAge)} anos` : `além dos ${rLife}`}
                  accent={retirement.lastsUntilAge !== null && retirement.lastsUntilAge < Number(rLife) ? "down" : "up"}
                />
                <ResultTile label="Capital necessário p/ renda desejada" value={formatBRL(retirement.requiredCapital)} />
                <ResultTile label="Aporte necessário" value={`${formatBRL(retirement.requiredMonthly)}/mês`} accent="inv" />
                <ResultTile label="Diferença vs aporte atual" value={formatBRL(Math.max(0, retirement.requiredMonthly - (parseCurrencyInput(rMonthly) ?? 0)))} accent={retirement.requiredMonthly > (parseCurrencyInput(rMonthly) ?? 0) ? "down" : "up"} />
              </div>
              <p className="mt-3 text-xs text-mut">
                Considere somar a aposentadoria pública (INSS) e previdência privada à renda sustentável.
                Retorno nominal usado: {formatPercent(Number(fReturn.replace(",", ".")) || 0)} a.a. · inflação {formatPercent(Number(fInfl.replace(",", ".")) || 0)}.
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "divida" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          <Card className="anim-rise p-5">
            <SectionHeader title="Sua dívida" subtitle="Horizonte de 5 anos" />
            <div className="space-y-3">
              <NumField id="d-balance" label="Saldo devedor" value={dBalance} onChange={setDBalance} suffix="R$" />
              <NumField id="d-rate" label="Juros" value={dRate} onChange={setDRate} suffix="% a.a." />
              <NumField id="d-payment" label="Pagamento mensal" value={dPayment} onChange={setDPayment} suffix="R$" />
            </div>
            <p className="mt-3 text-xs text-mut">
              Também disponível em Dívidas → “Quitar vs investir” usando os dados reais de cada contrato.
            </p>
          </Card>
          <Card className="anim-rise p-5">
            <div style={{ animationDelay: "80ms" }}>
              <SectionHeader title="Comparação em 5 anos" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-up/30 bg-up/5 p-4">
                  <p className="text-sm font-bold text-up">Quitar antecipado</p>
                  <ul className="mt-2 space-y-1 text-[13px] text-ink">
                    <li>Zerada em <strong>{debtSim.payoff.monthsToZero === Infinity ? "—" : `${debtSim.payoff.monthsToZero} meses`}</strong></li>
                    <li>Juros pagos: <strong>{formatBRL(debtSim.payoff.totalInterest)}</strong></li>
                    <li>Patrimônio final: <strong>{formatBRL(debtSim.payoff.finalWealth)}</strong></li>
                  </ul>
                </div>
                <div className="rounded-xl border border-inv/30 bg-inv/5 p-4">
                  <p className="text-sm font-bold text-inv">Investir a diferença</p>
                  <ul className="mt-2 space-y-1 text-[13px] text-ink">
                    <li>Investimento: <strong>{formatBRL(debtSim.invest.finalWealth)}</strong></li>
                    <li>Dívida restante: <strong className="text-down">{formatBRL(debtSim.invest.debtAtEnd)}</strong></li>
                    <li>Líquido: <strong>{formatBRL(debtSim.invest.finalWealth - debtSim.invest.debtAtEnd)}</strong></li>
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-xs text-mut">
                Para alcançar {formatBRL(1_000_000)} em 10 anos partindo do investido hoje: aporte de{" "}
                <strong className="text-ink">
                  {formatBRL(requiredMonthly(1_000_000, parseCurrencyInput(uInitial) ?? 0, 10, Number(uRate.replace(",", ".")) || 0))}/mês
                </strong>{" "}
                à taxa configurada no simulador universal.
              </p>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
