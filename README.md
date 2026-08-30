# Controle Financeiro

Plataforma completa de finanças pessoais que roda **100% no navegador** — sem servidor, sem conta, sem enviar seus dados para lugar nenhum. Tudo fica no `localStorage` do seu dispositivo, com camada de armazenamento isolada pronta para evoluir para um banco de dados no futuro.

![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=0a0f0d)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=0a0f0d)
![Dados](https://img.shields.io/badge/Dados-100%25%20local-1d6e4e?style=for-the-badge)

---

## O que ele faz

**Integridade em primeiro lugar.** Existe uma única fonte de verdade: contas + transações. Saldos, faturas, limites de cartão, patrimônio e indicadores são sempre **derivados** — nunca armazenados duas vezes, nunca duplicados.

| Módulo | Destaques |
|---|---|
| 📊 **Dashboard** | Cards configuráveis, patrimônio líquido, receitas × despesas, evolução patrimonial, próximos vencimentos |
| 💸 **Movimentações** | 10 tipos (receita, despesa, transferência, aporte, resgate, dividendo…), filtros, busca, CSV, **exclusão lógica com trilha de auditoria imutável** |
| 🏦 **Contas** | Corrente, poupança, carteira, salário, internacional · saldo derivado do histórico · **reconciliação banco × sistema** |
| 💳 **Cartões** | Faturas mensais derivadas, encargos, limite disponível automático, **parcelamento em N× com reconhecimento mensal** |
| 📈 **Investimentos** | 13 tipos · rentabilidade configurável (manual, fixa, % CDI, % Selic, IPCA+) · **agrupamento com confirmação** · CAGR, MWR, retorno real · dividendos |
| 🏛️ **Patrimônio** | Ativos financeiros, bens e passivos separados · bruto × líquido · linha do tempo anual |
| 🧾 **Dívidas** | Financiamentos (Price/SAC), consórcios, amortizações, simulação *quitar × investir* |
| 🎯 **Metas** | Por prazo ou por aporte, projeção, prioridade, vínculo com conta/investimento |
| 📉 **Orçamentos** | Limites por categoria com utilizado/disponível/excedido e previsão de fechamento |
| 🔁 **Recorrências** | Assinaturas controladas + **detector de cobranças esquecidas** no extrato |
| ⚙️ **Automação** | Regras inteligentes ("se contém UBER → Transporte") e automações ("salário → dividir 50/20/20/10") |
| 🩺 **Saúde financeira** | Score 0–100 com fatores explicados + **verificador de qualidade dos dados** |
| 🧪 **Laboratório** | Simulador universal, FIRE, aposentadoria — nunca alteram seus dados reais |
| 💬 **Assistente** | "Quanto gastei com alimentação este ano?" — respostas com **seus dados reais**, sem inventar nada |
| 🔍 **Busca universal** | Atalho `/` · procura em transações, contas, cartões, investimentos, dívidas, metas e bens |
| 💾 **Backup** | `backup.fin.NOME.DATA.json` exportável/restaurável · **Zerar sistema** com confirmação destrutiva |

Dark mode persistido, responsivo (sidebar no desktop, menu inferior + FAB no celular), acessibilidade básica e validação em todos os formulários.

## Arquitetura

```
src/
├── components/      UI reutilizável (ui, layout, charts, modais por domínio, busca)
├── pages/           16 telas (uma por módulo)
├── contexts/        FinanceContext (dados + regras + automações), Theme, Toast
├── services/
│   ├── storage.ts   StorageAdapter ← único ponto que conhece o localStorage
│   ├── api.ts       "API" com latência simulada — troque por HTTP no futuro
│   └── migration.ts Migração segura v1 → v2 (nunca apaga as chaves antigas)
├── hooks/           useHashRoute, useDebounce, useAnimatedNumber
├── utils/           finance (motor de integridade), simulations, csv, format, date
├── data/            categorias hierárquicas padrão + estrutura inicial vazia
└── types/           domínio completo tipado (sem `any`)
```

**Decisões que importam:**

- **Exclusão lógica** — lançamentos nunca somem: ficam `cancelada`/`estornada` com registro de quem, quando e por quê (criado → alterado → corrigido → estornado/cancelado).
- **Parcelas e faturas são derivadas** das transações; pagar a fatura debita a conta e libera o limite **sem duplicar despesa**.
- **Transferências e aportes** não contam como receita/despesa no resultado.
- **Instalação nova = tudo zerado.** Nenhum dado fictício; gráficos exibem estado vazio até você cadastrar a primeira informação.

## Rodando localmente

```bash
npm install     # instala dependências
npm run dev     # desenvolvimento (http://localhost:5173)
npm run build   # produção → dist/
npm run typecheck
```

## Privacidade

Seus dados financeiros **não saem do seu navegador**. Não há telemetria, analytics ou requisições externas. Exporte um backup JSON a qualquer momento em *Configurações → Exportar minha vida financeira*.

## Licença

Uso pessoal. Sinta-se à vontade para adicionar uma licença via interface do GitHub ao criar o repositório.
