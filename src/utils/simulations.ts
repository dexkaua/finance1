/**
 * Motor matemático de simulações — NÃO altera dados reais.
 * Capitalização composta com taxa equivalente mensal.
 */

/** Taxa anual → equivalente mensal. */
export function monthlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

export interface SeriesPoint {
  label: string;
  nominal: number;
  real: number;
  contributed: number;
}

export interface ProjectionInput {
  initial: number;
  monthly: number;
  years: number;
  annualRatePct: number;
  inflationPct: number;
  taxPct?: number;
}

export interface ProjectionResult {
  nominal: number;
  real: number;
  contributed: number;
  interest: number;
  series: SeriesPoint[];
}

export function projectInvestment(input: ProjectionInput): ProjectionResult {
  const i = monthlyRate(input.annualRatePct);
  const months = Math.max(1, Math.round(input.years * 12));
  let balance = input.initial;
  let contributed = input.initial;
  const series: SeriesPoint[] = [];
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + i) + input.monthly;
    contributed += input.monthly;
    if (m % 12 === 0 || m === months) {
      const yearsGone = m / 12;
      series.push({
        label: `${Math.round(yearsGone)}a`,
        nominal: balance,
        real: balance / Math.pow(1 + input.inflationPct / 100, yearsGone),
        contributed,
      });
    }
  }
  const gross = balance;
  const net = input.taxPct ? input.initial + (gross - input.initial - (contributed - input.initial)) * (1 - input.taxPct / 100) + (contributed - input.initial) : gross;
  return {
    nominal: net,
    real: net / Math.pow(1 + input.inflationPct / 100, input.years),
    contributed,
    interest: net - contributed,
    series,
  };
}

/** Aporte mensal necessário para atingir o objetivo. */
export function requiredMonthly(target: number, initial: number, years: number, annualRatePct: number): number {
  const i = monthlyRate(annualRatePct);
  const n = Math.max(1, Math.round(years * 12));
  const fvInitial = initial * Math.pow(1 + i, n);
  if (target <= fvInitial) return 0;
  const factor = (Math.pow(1 + i, n) - 1) / i;
  return (target - fvInitial) / factor;
}

/** Meses necessários para atingir o objetivo com aporte fixo. Infinity se impossível. */
export function monthsToReach(target: number, initial: number, monthly: number, annualRatePct: number): number {
  const i = monthlyRate(annualRatePct);
  if (initial >= target) return 0;
  if (i === 0) {
    return monthly <= 0 ? Infinity : Math.ceil((target - initial) / monthly);
  }
  if (monthly <= 0 && initial <= 0) return Infinity;
  const num = target * i + monthly;
  const den = initial * i + monthly;
  if (den <= 0 || num / den <= 0) return Infinity;
  return Math.ceil(Math.log(num / den) / Math.log(1 + i));
}

/* ------------------------- Amortização (financiamentos) ---------------- */

export interface AmortRow {
  n: number;
  payment: number;
  interest: number;
  amortization: number;
  balance: number;
}

export function priceTable(principal: number, annualRatePct: number, installments: number): AmortRow[] {
  const i = monthlyRate(annualRatePct);
  const pmt = i === 0 ? principal / installments : (principal * i) / (1 - Math.pow(1 + i, -installments));
  let balance = principal;
  const rows: AmortRow[] = [];
  for (let n = 1; n <= installments; n++) {
    const interest = balance * i;
    const amort = pmt - interest;
    balance = Math.max(0, balance - amort);
    rows.push({ n, payment: pmt, interest, amortization: amort, balance });
  }
  return rows;
}

export function sacTable(principal: number, annualRatePct: number, installments: number): AmortRow[] {
  const i = monthlyRate(annualRatePct);
  const amort = principal / installments;
  let balance = principal;
  const rows: AmortRow[] = [];
  for (let n = 1; n <= installments; n++) {
    const interest = balance * i;
    balance = Math.max(0, balance - amort);
    rows.push({ n, payment: amort + interest, interest, amortization: amort, balance });
  }
  return rows;
}

/* ----------------------------- Rentabilidade --------------------------- */

/** CAGR — taxa de crescimento anual composta. */
export function cagr(startValue: number, endValue: number, years: number): number | null {
  if (startValue <= 0 || years <= 0 || endValue <= 0) return null;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

export interface CashFlow {
  /** Em meses desde o início (0 = hoje/primeiro aporte). */
  month: number;
  /** Aporte positivo, resgate negativo. */
  amount: number;
}

/**
 * Money-Weighted Return mensal por Newton-Raphson.
 * Encontra r tal que Σ CF_t·(1+r)^(N−t) = valorFinal.
 */
export function mwrMonthly(flows: CashFlow[], finalValue: number, totalMonths: number): number | null {
  if (flows.length === 0) return null;
  let r = 0.005;
  for (let iter = 0; iter < 60; iter++) {
    let f = -finalValue;
    let df = 0;
    for (const cf of flows) {
      const exp = totalMonths - cf.month;
      const growth = Math.pow(1 + r, exp);
      f += cf.amount * growth;
      if (exp !== 0) df += cf.amount * exp * Math.pow(1 + r, exp - 1);
    }
    if (Math.abs(df) < 1e-12) break;
    const next = r - f / df;
    if (!Number.isFinite(next)) return null;
    if (Math.abs(next - r) < 1e-9) {
      r = next;
      break;
    }
    r = next;
  }
  if (!Number.isFinite(r) || r < -0.5 || r > 1) return null;
  return r;
}

export function annualize(monthly: number): number {
  return (Math.pow(1 + monthly, 12) - 1) * 100;
}

/* ---------------------- Quitar dívida vs investir ---------------------- */

export interface DebtVsInvestInput {
  debtBalance: number;
  debtAnnualRatePct: number;
  monthlyPayment: number;
  investAnnualRatePct: number;
  horizonYears: number;
}

export interface DebtVsInvestResult {
  /** Cenário A: quitar a dívida o quanto antes e depois investir o valor liberado. */
  payoff: { monthsToZero: number; totalInterest: number; finalWealth: number };
  /** Cenário B: pagar o mínimo (juros) e investir a diferença — aqui: investir tudo. */
  invest: { finalWealth: number; debtAtEnd: number };
}

export function debtVsInvest(input: DebtVsInvestInput): DebtVsInvestResult {
  const debtI = monthlyRate(input.debtAnnualRatePct);
  const invI = monthlyRate(input.investAnnualRatePct);
  const months = Math.round(input.horizonYears * 12);

  // Cenário A: quitar
  let balance = input.debtBalance;
  let interestPaid = 0;
  let monthsToZero = Infinity;
  let wealth = 0;
  for (let m = 1; m <= months; m++) {
    if (balance > 0) {
      const interest = balance * debtI;
      interestPaid += interest;
      const amort = Math.min(input.monthlyPayment, balance + interest);
      balance = Math.max(0, balance + interest - amort);
      if (balance === 0 && monthsToZero === Infinity) monthsToZero = m;
      const freed = input.monthlyPayment - amort;
      if (freed > 0) wealth = wealth * (1 + invI) + freed;
    } else {
      wealth = wealth * (1 + invI) + input.monthlyPayment;
    }
  }

  // Cenário B: rolar dívida pagando só juros e investir o principal
  let rollBalance = input.debtBalance;
  let inv = 0;
  for (let m = 1; m <= months; m++) {
    const interest = rollBalance * debtI;
    rollBalance += interest;
    inv = inv * (1 + invI) + Math.max(0, input.monthlyPayment - interest);
  }

  return {
    payoff: { monthsToZero, totalInterest: interestPaid, finalWealth: wealth },
    invest: { finalWealth: inv, debtAtEnd: rollBalance },
  };
}

/* ------------------------------ FIRE / aposentadoria ------------------- */

export interface FireInput {
  currentAge: number;
  invested: number;
  monthlyExpenses: number;
  monthlyContribution: number;
  annualReturnPct: number;
  inflationPct: number;
  withdrawalRatePct: number;
  maxAge: number;
}

export interface FireResult {
  fireAge: number | null;
  fireNumber: number;
  series: Array<{ label: string; patrimonio: number; meta: number }>;
}

export function projectFire(input: FireInput): FireResult {
  const realReturn = (1 + input.annualReturnPct / 100) / (1 + input.inflationPct / 100) - 1;
  const expensesToday = input.monthlyExpenses * 12;
  const fireNumber = expensesToday / (input.withdrawalRatePct / 100);
  let balance = input.invested;
  let fireAge: number | null = null;
  const series: Array<{ label: string; patrimonio: number; meta: number }> = [];
  for (let age = input.currentAge; age <= input.maxAge; age++) {
    const neededToday = expensesToday / (input.withdrawalRatePct / 100);
    if (fireAge === null && balance >= neededToday) fireAge = age;
    series.push({ label: String(age), patrimonio: balance, meta: neededToday });
    balance = balance * (1 + realReturn) + input.monthlyContribution * 12;
  }
  return { fireAge, fireNumber, series };
}

export interface RetirementInput {
  currentAge: number;
  invested: number;
  monthlyContribution: number;
  desiredMonthlyIncome: number;
  annualReturnPct: number;
  inflationPct: number;
  retirementAge: number;
  lifeExpectancy: number;
}

export interface RetirementResult {
  projectedAtRetirement: number;
  sustainableMonthly: number;
  lastsUntilAge: number | null;
  requiredCapital: number;
  requiredMonthly: number;
}

export function projectRetirement(input: RetirementInput): RetirementResult {
  const accumYears = Math.max(0, input.retirementAge - input.currentAge);
  const projection = projectInvestment({
    initial: input.invested,
    monthly: input.monthlyContribution,
    years: accumYears,
    annualRatePct: input.annualReturnPct,
    inflationPct: 0,
  });
  const capital = projection.nominal;
  const monthlyRatePct = Math.pow(1 + input.annualReturnPct / 100, 1 / 12) - 1;

  // Quanto dura o patrimônio retirando a renda desejada
  let balance = capital;
  let months = 0;
  const income = input.desiredMonthlyIncome;
  const maxMonths = (input.lifeExpectancy - input.retirementAge) * 12;
  while (balance > 0 && months < maxMonths + 120) {
    balance = balance * (1 + monthlyRatePct) - income;
    months++;
    if (balance <= 0) break;
  }
  const lastsUntilAge = balance > 0 ? null : input.retirementAge + months / 12;

  // Renda sustentável (anuidade): quanto dá para retirar por 30 anos
  const n = 30 * 12;
  const sustainable =
    monthlyRatePct === 0 ? capital / n : (capital * monthlyRatePct) / (1 - Math.pow(1 + monthlyRatePct, -n));

  // Capital necessário para a renda desejada (30 anos)
  const requiredCapital =
    monthlyRatePct === 0
      ? income * n
      : (income * (1 - Math.pow(1 + monthlyRatePct, -n))) / monthlyRatePct;

  const requiredMonthlyValue = requiredMonthly(
    requiredCapital,
    input.invested,
    accumYears,
    input.annualReturnPct,
  );

  return {
    projectedAtRetirement: capital,
    sustainableMonthly: sustainable,
    lastsUntilAge,
    requiredCapital,
    requiredMonthly: requiredMonthlyValue,
  };
}
