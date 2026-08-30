import type {
  Account,
  AppData,
  Asset,
  Automation,
  Budget,
  CreditCard,
  Debt,
  Goal,
  Investment,
  InvoiceExtras,
  InvoicePayment,
  Recurrence,
  Rule,
  Settings,
  Transaction,
  TxKind,
  PaymentMethod,
} from "../types";
import {
  addDaysISO,
  currentMonthKey,
  dayInMonth,
  invoiceDueDate,
  shiftMonthKey,
  todayISO,
  toISODate,
} from "../utils/date";

export const DEFAULT_SETTINGS: Settings = {
  currency: "BRL",
  benchmarks: { cdi: 13.15, selic: 13.25, ipca: 4.8, ibov: 9.5, sp500: 11.2 },
  dashboardWidgets: {
    networth: true,
    available: true,
    investments: true,
    debts: true,
    income: true,
    expenses: true,
    contributions: true,
    savings: true,
  },
  ignoredGroups: [],
  lastScore: null,
};

/**
 * Estado inicial de uma instalação nova: SOMENTE estrutura, categorias padrão
 * e configurações. Nenhuma conta, transação, investimento ou qualquer registro
 * financeiro — todos os valores começam zerados/inexistentes.
 */
export function emptyAppData(settings: Settings = DEFAULT_SETTINGS): AppData {
  return {
    schemaVersion: 2,
    transactions: [],
    accounts: [],
    cards: [],
    investments: [],
    debts: [],
    goals: [],
    budgets: [],
    assets: [],
    recurrences: [],
    rules: [],
    automations: [],
    invoiceExtras: [],
    invoicePayments: [],
    settings: { ...settings },
  };
}

/**
 * Dados de exemplo — NUNCA carregados automaticamente.
 * Usados apenas quando o usuário solicita explicitamente em
 * Configurações → "Carregar dados de exemplo", para explorar o sistema.
 */
export function buildSeedData(): AppData {
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) months.push(shiftMonthKey(currentMonthKey(), -i));
  const currentDay = Number(todayISO().slice(8, 10));

  const accounts: Account[] = [
    {
      id: "acc-nubank",
      institution: "Nubank",
      agency: "0001",
      number: "48291-3",
      type: "corrente",
      currency: "BRL",
      initialBalance: 3200,
      limit: 500,
      holder: "Você",
      joint: false,
      openedAt: `${shiftMonthKey(months[0], -24)}-03-12`,
      closedAt: null,
    },
    {
      id: "acc-itau",
      institution: "Itaú Corretora",
      type: "investimentos",
      currency: "BRL",
      initialBalance: 5200,
      joint: false,
      holder: "Você",
    },
    { id: "acc-carteira", institution: "Carteira (espécie)", type: "carteira", currency: "BRL", initialBalance: 350, joint: false },
  ];

  const cards: CreditCard[] = [
    {
      id: "card-nu",
      name: "Nubank Ultravioleta",
      bank: "Nubank",
      brand: "mastercard",
      limit: 8000,
      closingDay: 15,
      dueDay: 22,
      holder: "Você",
      additional: false,
      annualFee: 0,
      benefits: "Sala VIP, seguro viagem",
      cashbackPct: 1,
      pointsProgram: "Ultravioleta pontos",
      accountId: "acc-nubank",
    },
  ];

  const transactions: Transaction[] = [];
  let seq = 0;

  const add = (
    monthIndex: number,
    day: number,
    kind: TxKind,
    description: string,
    amount: number,
    categoryId: string,
    paymentMethod: PaymentMethod,
    extra: Partial<Transaction> = {},
  ) => {
    const isCurrentMonth = monthIndex === months.length - 1;
    if (isCurrentMonth && day > currentDay) return null;
    const [y, m] = months[monthIndex].split("-").map(Number);
    const safeDay = Math.min(day, 28);
    const date = toISODate(new Date(y, m - 1, safeDay));
    const tx: Transaction = {
      id: `seed-tx-${++seq}`,
      kind,
      description,
      amount: Math.round(amount * 100) / 100,
      categoryId,
      date,
      accountId: "acc-nubank",
      paymentMethod,
      status: "criada",
      source: "manual",
      audit: [],
      createdAt: new Date(y, m - 1, safeDay, 9, 30).toISOString(),
      ...extra,
    };
    transactions.push(tx);
    return tx;
  };

  const freelas = [0, 1450, 900, 1800, 1200, 750];
  const mercados = [1184.3, 1262.75, 1101.2, 1320.4, 1245.9, 912.4];
  const restaurantes = [326, 288, 412, 195, 370, 155];
  const ubers = [142.5, 168.2, 121.8, 190.4, 154.6, 96.3];

  months.forEach((monthKey, i) => {
    add(i, 5, "receita", "Salário mensal", 8450, "salario", "transferencia");
    if (freelas[i] > 0) add(i, 12 + (i % 6), "receita", "Projeto freelance", freelas[i], "freelance", "pix");
    add(i, 10, "transferencia", "Transferência para corretora", 1200, "aportes", "transferencia", { toAccountId: "acc-itau" });
    add(i, 12, "aporte", "Aporte mensal na carteira", 1000, "aportes", "pix", { accountId: "acc-itau", investmentId: "inv-tesouro-selic" });
    add(i, 14, "dividendo", "Dividendos FIIs", 88 + i * 4, "dividendos", "transferencia", { accountId: "acc-itau", investmentId: "inv-hglg" });
    if (i % 3 === 1) add(i, 20, "juros", "Rendimentos CDB", 86 + i * 7, "juros-recebidos", "transferencia", { accountId: "acc-itau", investmentId: "inv-cdb" });

    add(i, 6, "despesa", "Aluguel", 2150, "aluguel", "boleto");
    add(i, 8, "despesa", "Condomínio", 420, "condominio", "boleto");
    add(i, 11, "despesa", "Conta de luz", 168 + (i % 4) * 18, "energia", "boleto");
    add(i, 9, "despesa", "Internet fibra", 129.9, "internet", "boleto");
    add(i, 8, "despesa", "Supermercado", mercados[i], "mercado", "credito", { cardId: "card-nu" });
    add(i, 18, "despesa", "Feira e hortifrúti", 184.5 + (i % 3) * 22, "mercado", "pix");
    add(i, 21, "despesa", "Restaurantes", restaurantes[i], "restaurante", "credito", { cardId: "card-nu" });
    add(i, 3, "despesa", "Netflix", 55.9, "assinaturas", "credito", { cardId: "card-nu" });
    add(i, 3, "despesa", "Spotify", 34.9, "assinaturas", "credito", { cardId: "card-nu" });
    add(i, 24, "despesa", "iCloud 200GB", 24.9, "assinaturas", "credito", { cardId: "card-nu" });
    add(i, 15, "despesa", "Combustível", 372.4, "combustivel", "debito");
    add(i, 23, "despesa", "Uber", ubers[i], "uber", "credito", { cardId: "card-nu" });
    add(i, 4, "despesa", "Academia", 119.9, "saude", "debito");
    add(i, 9, "despesa", "Curso de inglês", 189.9, "educacao", "credito", { cardId: "card-nu" });
    add(i, 16, "despesa", "Parcela financiamento carro", 1480, "outras-despesas", "boleto", { debtId: "debt-carro" });
  });

  // Compra parcelada: Notebook em 12x de R$ 400 a partir do mês m2 (3 meses atrás).
  const groupId = "parc-notebook";
  const totalParc = 4800;
  const parcCount = 12;
  const parcAmount = totalParc / parcCount;
  const startMonthIndex = 2;
  for (let p = 0; p < parcCount; p++) {
    const mIndex = startMonthIndex + p;
    const month = months[mIndex] ?? shiftMonthKey(months[months.length - 1], mIndex - (months.length - 1));
    const dueDate = invoiceDueDate(month, 15, 22);
    transactions.push({
      id: `seed-parc-${p + 1}`,
      kind: "despesa",
      description: "Notebook Dell Inspiron",
      amount: parcAmount,
      categoryId: "compras",
      date: dueDate,
      accountId: "acc-nubank",
      cardId: "card-nu",
      paymentMethod: "credito",
      status: "criada",
      installmentGroup: groupId,
      installmentNumber: p + 1,
      installmentTotal: parcCount,
      source: "parcelamento",
      audit: [],
      createdAt: new Date().toISOString(),
    });
  }

  // Faturas pagas dos meses fechados (m0..m4 pagas; mês atual em aberto).
  const invoicePayments: InvoicePayment[] = [];
  months.slice(0, -1).forEach((month, idx) => {
    const purchases = transactions.filter(
      (tx) => tx.cardId === "card-nu" && tx.date.slice(0, 7) === month,
    );
    const total = purchases.reduce((acc, tx) => acc + tx.amount, 0);
    if (total <= 0) return;
    invoicePayments.push({
      id: `seed-pay-${idx}`,
      cardId: "card-nu",
      month,
      date: dayInMonth(month, 21),
      amount: Math.round(total * 100) / 100,
      accountId: "acc-nubank",
    });
    transactions.push({
      id: `seed-tx-pay-${idx}`,
      kind: "transferencia",
      description: `Pagamento fatura Nubank ${month.split("-").reverse().join("/")}`,
      amount: Math.round(total * 100) / 100,
      categoryId: "outras-despesas",
      date: dayInMonth(month, 21),
      accountId: "acc-nubank",
      cardId: "card-nu",
      paymentMethod: "pix",
      status: "criada",
      source: "fatura",
      note: "Pagamento de fatura — não conta como despesa (compras já registradas).",
      audit: [],
      createdAt: new Date().toISOString(),
    });
  });

  const invoiceExtras: InvoiceExtras[] = [
    { id: "seed-extra-1", cardId: "card-nu", month: months[1], juros: 0, multa: 0, iof: 18.4, tarifas: 0 },
  ];

  const startAt = (monthsAgo: number, day: number): string => {
    const key = shiftMonthKey(currentMonthKey(), -monthsAgo);
    return dayInMonth(key, day);
  };
  const dueAt = (monthsAhead: number, day: number): string => {
    const key = shiftMonthKey(currentMonthKey(), monthsAhead);
    return dayInMonth(key, day);
  };

  const investments: Investment[] = [
    {
      id: "inv-tesouro-selic", name: "Tesouro Selic 2029", type: "tesouro-selic",
      institution: "Tesouro Direto", broker: "XP Investimentos",
      quantity: 2.6, avgPrice: null, currentPrice: null,
      investedAmount: 32000, currentValue: 35120.44, fees: 0, taxes: 0,
      startDate: startAt(16, 12), maturityDate: "2029-03-01",
      yield: { mode: "selic", rate: 100 },
    },
    {
      id: "inv-tesouro-selic-2", name: "Tesouro Selic 2029", type: "tesouro-selic",
      institution: "Tesouro Direto", broker: "XP Investimentos",
      quantity: 0.4, avgPrice: null, currentPrice: null,
      investedAmount: 5000, currentValue: 5483.1, fees: 0, taxes: 0,
      startDate: startAt(7, 20), maturityDate: "2029-03-01",
      yield: { mode: "selic", rate: 100 },
      note: "Aporte avulso — candidato a agrupamento com a posição principal.",
    },
    {
      id: "inv-tesouro-ipca", name: "Tesouro IPCA+ 2035", type: "tesouro-ipca",
      institution: "Tesouro Direto", broker: "XP Investimentos",
      quantity: 1.2, avgPrice: null, currentPrice: null,
      investedAmount: 15800, currentValue: 17218.9, fees: 0, taxes: 0,
      startDate: startAt(14, 8), maturityDate: "2035-05-15",
      yield: { mode: "ipca", rate: 6.1 },
    },
    {
      id: "inv-cdb", name: "CDB 110% do CDI", type: "cdb",
      institution: "Itaú", broker: "Itaú Corretora",
      quantity: null, avgPrice: null, currentPrice: null,
      investedAmount: 18000, currentValue: 19652.1, fees: 0, taxes: 0,
      startDate: startAt(12, 8), maturityDate: dueAt(24, 8),
      yield: { mode: "cdi", rate: 110 },
    },
    {
      id: "inv-lci", name: "LCI 92% do CDI", type: "lci",
      institution: "Banco do Brasil", broker: "BB Investimentos",
      quantity: null, avgPrice: null, currentPrice: null,
      investedAmount: 10000, currentValue: 10712.55, fees: 0, taxes: 0,
      startDate: startAt(9, 15), maturityDate: dueAt(15, 15),
      yield: { mode: "cdi", rate: 92 },
      note: "Isenta de IR.",
    },
    {
      id: "inv-petr4", name: "PETR4", type: "acoes",
      institution: "Petrobras PN", broker: "Rico",
      quantity: 120, avgPrice: 28.5, currentPrice: 34.2,
      investedAmount: 3420, currentValue: 4104, fees: 12.8, taxes: 0,
      startDate: startAt(20, 15),
      yield: { mode: "manual", rate: 0 },
    },
    {
      id: "inv-vale3", name: "VALE3", type: "acoes",
      institution: "Vale ON", broker: "Rico",
      quantity: 80, avgPrice: 61, currentPrice: 58.4,
      investedAmount: 4880, currentValue: 4672, fees: 12.8, taxes: 0,
      startDate: startAt(18, 10),
      yield: { mode: "manual", rate: 0 },
      note: "Posição em leve prejuízo — monitorar.",
    },
    {
      id: "inv-hglg", name: "HGLG11", type: "fiis",
      institution: "FII Logística", broker: "Rico",
      quantity: 40, avgPrice: 165, currentPrice: 178.2,
      investedAmount: 6600, currentValue: 7128, fees: 12.8, taxes: 0,
      startDate: startAt(15, 20),
      yield: { mode: "manual", rate: 0 },
    },
    {
      id: "inv-bova", name: "BOVA11", type: "etf",
      institution: "ETF Ibovespa", broker: "Rico",
      quantity: 30, avgPrice: 118, currentPrice: 131.4,
      investedAmount: 3540, currentValue: 3942, fees: 8.4, taxes: 0,
      startDate: startAt(11, 5),
      yield: { mode: "manual", rate: 0 },
    },
    {
      id: "inv-btc", name: "Bitcoin", type: "cripto",
      institution: "BTC", broker: "Mercado Bitcoin",
      quantity: 0.012, avgPrice: 480000, currentPrice: 745000,
      investedAmount: 5760, currentValue: 8940, fees: 45, taxes: 0,
      startDate: startAt(14, 5),
      yield: { mode: "manual", rate: 0 },
    },
    {
      id: "inv-prev", name: "Previdência VGBL", type: "previdencia",
      institution: "Icatu", broker: "Icatu Seguros",
      quantity: null, avgPrice: null, currentPrice: null,
      investedAmount: 9000, currentValue: 9612.88, fees: 0, taxes: 0,
      startDate: startAt(8, 3),
      yield: { mode: "fixa", rate: 11.5 },
    },
  ];

  const debts: Debt[] = [
    {
      id: "debt-carro", kind: "financiamento", creditor: "Banco Santander",
      purpose: "HB20 1.0 2021", originalAmount: 58000, balance: 31500,
      annualRate: 21.9, cet: 24.3, totalInstallments: 48, paidInstallments: 26,
      monthlyPayment: 1480, dueDay: 10, startDate: startAt(26, 10), payments: [],
      note: "Financiamento em 48x. Amortizações reduzem juros futuros.",
    },
    {
      id: "debt-pessoal", kind: "divida", creditor: "Nubank Empréstimo",
      purpose: "Reforma do apartamento", originalAmount: 5000, balance: 1850,
      annualRate: 39.6, cet: 47.2, totalInstallments: 12, paidInstallments: 8,
      monthlyPayment: 485, dueDay: 18, startDate: startAt(8, 18), payments: [],
    },
  ];

  const assets: Asset[] = [
    { id: "asset-carro", name: "Hyundai HB20 1.0 2021", type: "carro", value: 52000, purchaseValue: 61500, purchaseDate: startAt(26, 10) },
    { id: "asset-iphone", name: "iPhone 14", type: "eletronico", value: 3800, purchaseValue: 5400, purchaseDate: startAt(14, 2) },
  ];

  const goals: Goal[] = [
    { id: "goal-reserva", name: "Reserva de emergência", purpose: "6 meses de despesas essenciais", targetAmount: 30000, currentAmount: 18750, deadline: dueAt(14, 10), color: "pine", priority: "alta", mode: "aporte", monthlyContribution: 800, accountId: "acc-itau" },
    { id: "goal-japao", name: "Viagem ao Japão", purpose: "Passagens, hospedagem e passeios", targetAmount: 15000, currentAmount: 6420, deadline: dueAt(20, 1), color: "gold", priority: "media", mode: "prazo" },
    { id: "goal-apt", name: "Entrada do apartamento", purpose: "20% de entrada + documentação", targetAmount: 90000, currentAmount: 24300, deadline: dueAt(40, 15), color: "inv", priority: "alta", mode: "aporte", monthlyContribution: 1500, investmentId: "inv-tesouro-ipca" },
    { id: "goal-note", name: "Notebook novo", purpose: "Máquina para trabalho", targetAmount: 9500, currentAmount: 8900, deadline: dueAt(2, 20), color: "teal", priority: "baixa", mode: "prazo" },
  ];

  const budgets: Budget[] = [
    { id: "bgt-mercado", categoryId: "mercado", monthlyLimit: 1500 },
    { id: "bgt-restaurante", categoryId: "restaurante", monthlyLimit: 500 },
    { id: "bgt-transporte", categoryId: "transporte", monthlyLimit: 600 },
    { id: "bgt-lazer", categoryId: "lazer", monthlyLimit: 400 },
    { id: "bgt-assinaturas", categoryId: "assinaturas", monthlyLimit: 160 },
  ];

  const recurrences: Recurrence[] = [
    { id: "rec-netflix", description: "Netflix", categoryId: "assinaturas", accountId: "acc-nubank", cardId: "card-nu", amount: 55.9, frequency: "mensal", nextDate: dayInMonth(currentMonthKey(), 26), active: true },
    { id: "rec-spotify", description: "Spotify", categoryId: "assinaturas", accountId: "acc-nubank", cardId: "card-nu", amount: 34.9, frequency: "mensal", nextDate: dayInMonth(currentMonthKey(), 26), active: true },
    { id: "rec-icloud", description: "iCloud 200GB", categoryId: "assinaturas", accountId: "acc-nubank", cardId: "card-nu", amount: 24.9, frequency: "mensal", nextDate: dayInMonth(currentMonthKey(), 27), active: true },
    { id: "rec-academia", description: "Academia", categoryId: "saude", accountId: "acc-nubank", amount: 119.9, frequency: "mensal", nextDate: addDaysISO(todayISO(), 6), active: true },
    { id: "rec-internet", description: "Internet fibra", categoryId: "internet", accountId: "acc-nubank", amount: 129.9, frequency: "mensal", nextDate: addDaysISO(todayISO(), 9), active: true },
  ];

  const rules: Rule[] = [
    { id: "rule-uber", name: "Uber → Transporte", enabled: true, match: { field: "descricao", operator: "contem", value: "UBER" }, action: { type: "categoria", categoryId: "uber" } },
    { id: "rule-ifood", name: "iFood → Delivery", enabled: true, match: { field: "descricao", operator: "contem", value: "IFOOD" }, action: { type: "categoria", categoryId: "delivery" } },
    { id: "rule-posto", name: "Posto → Combustível", enabled: true, match: { field: "descricao", operator: "contem", value: "POSTO" }, action: { type: "categoria", categoryId: "combustivel" } },
  ];

  const automations: Automation[] = [
    {
      id: "auto-salario",
      name: "Divisão do salário 50/20/20/10",
      enabled: true,
      triggerCategoryId: "salario",
      splits: [
        { id: "split-inv", label: "Investimentos", pct: 20, kind: "aporte", categoryId: "aportes", accountId: "acc-itau" },
        { id: "split-reserva", label: "Reserva", pct: 20, kind: "despesa", categoryId: "reserva" },
        { id: "split-lazer", label: "Lazer", pct: 10, kind: "despesa", categoryId: "lazer" },
      ],
    },
  ];

  return {
    schemaVersion: 2,
    transactions,
    accounts,
    cards,
    investments,
    debts,
    goals,
    budgets,
    assets,
    recurrences,
    rules,
    automations,
    invoiceExtras,
    invoicePayments,
    settings: { ...DEFAULT_SETTINGS },
  };
}
