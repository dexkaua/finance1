import type {
  AppData,
  Goal,
  Investment,
  PaymentMethod,
  Transaction,
  TransactionType,
} from "../types";
import { currentMonthKey, shiftMonthKey, toISODate, todayISO } from "../utils/date";

/**
 * Dados fictícios cobrindo os últimos 7 meses para o primeiro acesso,
 * garantindo dashboard, gráficos e relatórios preenchidos.
 */
export function buildSeedData(): AppData {
  const months: string[] = [];
  for (let i = 6; i >= 0; i--) months.push(shiftMonthKey(currentMonthKey(), -i));
  const currentDay = new Date().getDate();

  const transactions: Transaction[] = [];
  let seq = 0;

  const add = (
    monthIndex: number,
    day: number,
    type: TransactionType,
    description: string,
    amount: number,
    categoryId: string,
    paymentMethod: PaymentMethod,
  ) => {
    const isCurrentMonth = monthIndex === months.length - 1;
    if (isCurrentMonth && day > currentDay) return;
    const [y, m] = months[monthIndex].split("-").map(Number);
    const safeDay = Math.min(day, 28);
    transactions.push({
      id: `seed-tx-${++seq}`,
      type,
      description,
      amount: Math.round(amount * 100) / 100,
      categoryId,
      date: toISODate(new Date(y, m - 1, safeDay)),
      paymentMethod,
      createdAt: new Date(y, m - 1, safeDay, 9, 30).toISOString(),
    });
  };

  const freelas = [0, 1450, 900, 0, 1800, 1200, 750];
  const mercados = [1184.3, 1262.75, 1101.2, 1320.4, 1245.9, 1178.35, 612.4];
  const lazers = [426, 388, 512, 295, 470, 355, 180];
  const compras = [0, 349.9, 129, 659.8, 0, 289.9, 0];
  const saudes = [145, 0, 0, 320, 96, 0, 145];

  months.forEach((_, i) => {
    add(i, 5, "receita", "Salário mensal", 8450, "salario", "transferencia");
    if (freelas[i] > 0) {
      add(i, 12 + (i % 6), "receita", "Projeto freelance", freelas[i], "freelance", "pix");
    }
    if (i % 3 === 1) {
      add(i, 20, "receita", "Rendimentos de CDB", 86 + i * 7, "rendimentos", "transferencia");
    }
    add(i, 6, "investimento", "Aporte mensal na carteira", 1000, "aportes", "pix");
    add(i, 10, "despesa", "Aluguel e condomínio", 2350, "moradia", "boleto");
    add(i, 11, "despesa", "Conta de luz", 168 + (i % 4) * 18, "moradia", "boleto");
    add(i, 8, "despesa", "Supermercado", mercados[i], "alimentacao", "credito");
    add(i, 18, "despesa", "Feira e hortifrúti", 184.5 + (i % 3) * 22, "alimentacao", "pix");
    add(i, 15, "despesa", "Combustível e transporte", 372.4, "transporte", "debito");
    add(i, 3, "despesa", "Netflix", 55.9, "assinaturas", "credito");
    add(i, 3, "despesa", "Spotify", 34.9, "assinaturas", "credito");
    add(i, 4, "despesa", "Academia", 119.9, "saude", "debito");
    add(i, 21, "despesa", "Restaurantes e lazer", lazers[i], "lazer", "pix");
    if (saudes[i] > 0) add(i, 16, "despesa", "Farmácia", saudes[i], "saude", "credito");
    add(i, 9, "despesa", "Curso de inglês", 189.9, "educacao", "credito");
    if (compras[i] > 0) {
      add(i, 22, "despesa", "Compras diversas", compras[i], "compras", "credito");
    }
  });

  const startAt = (monthsAgo: number, day: number): string => {
    const key = shiftMonthKey(currentMonthKey(), -monthsAgo);
    const [y, m] = key.split("-").map(Number);
    return toISODate(new Date(y, m - 1, day));
  };
  const dueAt = (monthsAhead: number, day: number): string => {
    const key = shiftMonthKey(currentMonthKey(), monthsAhead);
    const [y, m] = key.split("-").map(Number);
    return toISODate(new Date(y, m - 1, day));
  };

  const investments: Investment[] = [
    {
      id: "seed-inv-1",
      name: "Tesouro Selic 2029",
      type: "tesouro",
      institution: "XP Investimentos",
      investedAmount: 32000,
      currentValue: 35120.44,
      annualRate: 11.2,
      startDate: startAt(16, 12),
    },
    {
      id: "seed-inv-2",
      name: "CDB 120% do CDI",
      type: "cdb",
      institution: "Itaú",
      investedAmount: 18000,
      currentValue: 19652.1,
      annualRate: 12.8,
      startDate: startAt(12, 8),
    },
    {
      id: "seed-inv-3",
      name: "Carteira de ações BR",
      type: "acoes",
      institution: "Rico",
      investedAmount: 24000,
      currentValue: 27834.75,
      annualRate: null,
      startDate: startAt(20, 15),
    },
    {
      id: "seed-inv-4",
      name: "FIIs de tijolo e papel",
      type: "fiis",
      institution: "Rico",
      investedAmount: 12500,
      currentValue: 13218.3,
      annualRate: 10.9,
      startDate: startAt(10, 20),
    },
    {
      id: "seed-inv-5",
      name: "Bitcoin",
      type: "cripto",
      institution: "Mercado Bitcoin",
      investedAmount: 6000,
      currentValue: 8941.02,
      annualRate: null,
      startDate: startAt(14, 5),
    },
    {
      id: "seed-inv-6",
      name: "Fundo DI Simples",
      type: "fundos",
      institution: "NuInvest",
      investedAmount: 9000,
      currentValue: 9612.88,
      annualRate: 11.5,
      startDate: startAt(8, 3),
    },
  ];

  const goals: Goal[] = [
    {
      id: "seed-goal-1",
      name: "Reserva de emergência",
      purpose: "6 meses de despesas essenciais",
      targetAmount: 30000,
      currentAmount: 18750,
      deadline: dueAt(14, 10),
      color: "pine",
    },
    {
      id: "seed-goal-2",
      name: "Viagem ao Japão",
      purpose: "Passagens, hospedagem e passeios",
      targetAmount: 15000,
      currentAmount: 6420,
      deadline: dueAt(20, 1),
      color: "gold",
    },
    {
      id: "seed-goal-3",
      name: "Entrada do apartamento",
      purpose: "20% de entrada + documentação",
      targetAmount: 90000,
      currentAmount: 24300,
      deadline: dueAt(40, 15),
      color: "inv",
    },
    {
      id: "seed-goal-4",
      name: "Notebook novo",
      purpose: "Máquina para trabalho",
      targetAmount: 9500,
      currentAmount: 8900,
      deadline: dueAt(2, 20),
      color: "teal",
    },
  ];

  return { transactions, investments, goals };
}

export { todayISO };
