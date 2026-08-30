import { useRef, useState } from "react";
import type { Currency } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { persistAll } from "../services/api";
import { LEGACY_KEYS, STORAGE_KEYS, storage } from "../services/storage";
import { buildSeedData } from "../data/seed";
import { downloadCsv, downloadJson } from "../utils/csv";
import { backupFileName } from "../utils/format";
import { categoryPath } from "../data/categories";
import { Badge, Card, PageHeader, SectionHeader } from "../components/ui/Display";
import { Button } from "../components/ui/Button";
import { ConfirmDialog, Modal } from "../components/ui/Modal";
import { Field, SelectInput, Segmented, TextInput } from "../components/ui/FormControls";
import { IconDownload, IconMoon, IconSun, IconAlert } from "../components/ui/icons";

const WIDGET_LABELS: Array<[string, string]> = [
  ["networth", "Patrimônio líquido"],
  ["available", "Saldo em contas"],
  ["investments", "Investimentos"],
  ["debts", "Dívidas"],
  ["income", "Receitas do mês"],
  ["expenses", "Despesas do mês"],
  ["contributions", "Aportes do mês"],
  ["savings", "Taxa de poupança"],
];

export function SettingsPage() {
  const { appData, settings, updateSettings } = useFinance();
  const { theme, toggleTheme } = useTheme();
  const { push } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [resetting, setResetting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const setBenchmark = (key: keyof typeof settings.benchmarks, value: string) => {
    const n = Number(value.replace(",", "."));
    if (Number.isFinite(n)) {
      updateSettings({ benchmarks: { ...settings.benchmarks, [key]: n } });
    }
  };

  const exportFullJson = () => {
    // Padrão: backup.fin.NOME.DD-MM-AAAA_HH-mm.json (nome sanitizado automaticamente)
    const filename = backupFileName(settings.userName);
    downloadJson(filename, {
      ...appData,
      exportedAt: new Date().toISOString(),
    });
    push("success", "Backup completo exportado", `Arquivo ${filename} — com todas as coleções, configurações e histórico de auditoria.`);
  };

  const exportModuleCsv = (module: string) => {
    switch (module) {
      case "transacoes":
        downloadCsv(
          "transacoes.csv",
          ["Data", "Tipo", "Descrição", "Categoria", "Valor", "Status"],
          appData.transactions.map((tx) => [tx.date, tx.kind, tx.description, categoryPath(tx.categoryId), tx.amount.toFixed(2).replace(".", ","), tx.status]),
        );
        break;
      case "contas":
        downloadCsv(
          "contas.csv",
          ["Instituição", "Tipo", "Moeda", "Saldo inicial"],
          appData.accounts.map((account) => [account.institution, account.type, account.currency, account.initialBalance.toFixed(2).replace(".", ",")]),
        );
        break;
      case "cartoes":
        downloadCsv(
          "cartoes.csv",
          ["Nome", "Banco", "Bandeira", "Limite"],
          appData.cards.map((card) => [card.name, card.bank, card.brand, card.limit.toFixed(2).replace(".", ",")]),
        );
        break;
      case "investimentos":
        downloadCsv(
          "investimentos.csv",
          ["Nome", "Tipo", "Instituição", "Investido", "Atual"],
          appData.investments.map((inv) => [inv.name, inv.type, inv.institution, inv.investedAmount.toFixed(2).replace(".", ","), inv.currentValue.toFixed(2).replace(".", ",")]),
        );
        break;
      case "dividas":
        downloadCsv(
          "dividas.csv",
          ["Credor", "Tipo", "Original", "Saldo", "Juros"],
          appData.debts.map((debt) => [debt.creditor, debt.kind, debt.originalAmount.toFixed(2).replace(".", ","), debt.balance.toFixed(2).replace(".", ","), String(debt.annualRate).replace(".", ",")]),
        );
        break;
      case "metas":
        downloadCsv(
          "metas.csv",
          ["Nome", "Objetivo", "Acumulado", "Prazo"],
          appData.goals.map((goal) => [goal.name, goal.targetAmount.toFixed(2).replace(".", ","), goal.currentAmount.toFixed(2).replace(".", ","), goal.deadline]),
        );
        break;
      case "patrimonio": {
        const invested = appData.investments.reduce((a, i) => a + i.currentValue, 0);
        const accounts = appData.accounts.reduce((a, acc) => a + acc.initialBalance, 0);
        const goods = appData.assets.reduce((a, x) => a + x.value, 0);
        const debts = appData.debts.reduce((a, d) => a + d.balance, 0);
        downloadCsv(
          "patrimonio.csv",
          ["Linha", "Valor"],
          [
            ["Contas (saldo inicial)", accounts.toFixed(2).replace(".", ",")],
            ["Investimentos", invested.toFixed(2).replace(".", ",")],
            ["Bens", goods.toFixed(2).replace(".", ",")],
            ["Dívidas", debts.toFixed(2).replace(".", ",")],
          ],
        );
        break;
      }
    }
    push("success", "CSV exportado", `Módulo ${module}.`);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? ""));
        if (!parsed || !Array.isArray(parsed.transactions)) {
          push("error", "Arquivo inválido", "O JSON não parece um backup do Controle Financeiro.");
          return;
        }
        persistAll({
          transactions: parsed.transactions ?? [],
          accounts: parsed.accounts ?? [],
          cards: parsed.cards ?? [],
          investments: parsed.investments ?? [],
          debts: parsed.debts ?? [],
          goals: parsed.goals ?? [],
          budgets: parsed.budgets ?? [],
          assets: parsed.assets ?? [],
          recurrences: parsed.recurrences ?? [],
          rules: parsed.rules ?? [],
          automations: parsed.automations ?? [],
          invoiceExtras: parsed.invoiceExtras ?? [],
          invoicePayments: parsed.invoicePayments ?? [],
          settings: parsed.settings ?? appData.settings,
          schemaVersion: 2,
        });
        push("success", "Backup importado", "Recarregue a página para ver os dados restaurados.");
      } catch {
        push("error", "Falha ao importar", "JSON inválido ou corrompido.");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Personalização, dados de mercado e portabilidade total" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="anim-rise p-5">
          <SectionHeader title="Preferências" subtitle="Moeda exibida, tema e cards do dashboard" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field id="set-currency" label="Moeda de exibição">
                <SelectInput
                  id="set-currency"
                  value={settings.currency}
                  onChange={(e) => {
                    updateSettings({ currency: e.target.value as Currency });
                    push("success", "Moeda alterada", `Valores exibidos em ${e.target.value}.`);
                  }}
                >
                  <option value="BRL">R$ — Real</option>
                  <option value="USD">US$ — Dólar</option>
                  <option value="EUR">€ — Euro</option>
                </SelectInput>
              </Field>
              <Field id="set-theme" label="Tema">
                <Segmented
                  ariaLabel="Tema"
                  value={theme}
                  onChange={() => toggleTheme()}
                  options={[
                    { value: "light", label: "Claro" },
                    { value: "dark", label: "Escuro" },
                  ]}
                />
              </Field>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink">Cards visíveis no dashboard</p>
              <div className="grid grid-cols-2 gap-2">
                {WIDGET_LABELS.map(([key, label]) => {
                  const enabled = settings.dashboardWidgets[key] !== false;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      onClick={() =>
                        updateSettings({
                          dashboardWidgets: { ...settings.dashboardWidgets, [key]: !enabled },
                        })
                      }
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-all ${
                        enabled ? "border-up/40 bg-up/5 text-ink" : "border-line bg-card2/40 text-mut"
                      }`}
                    >
                      {label}
                      <Badge tone={enabled ? "up" : "neutral"}>{enabled ? "on" : "off"}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-mut">
              {theme === "dark" ? <IconMoon size={14} /> : <IconSun size={14} />}
              O tema e a moeda persistem entre sessões neste navegador.
            </div>
          </div>
        </Card>

        <Card className="anim-rise p-5">
          <div style={{ animationDelay: "80ms" }}>
            <SectionHeader title="Índices de mercado" subtitle="Usados em projeções, rentabilidade real e simulações (editáveis)" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(
                [
                  ["cdi", "CDI"],
                  ["selic", "Selic"],
                  ["ipca", "IPCA"],
                  ["ibov", "Ibovespa"],
                  ["sp500", "S&P 500"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} id={`bench-${key}`} label={`${label} (% a.a.)`}>
                  <TextInput
                    id={`bench-${key}`}
                    inputMode="decimal"
                    defaultValue={String(settings.benchmarks[key]).replace(".", ",")}
                    onBlur={(e) => setBenchmark(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-mut">
              Valores anuais estimados — o sistema não consulta fontes externas; ajuste conforme o cenário.
            </p>
          </div>
        </Card>

        <Card className="anim-rise p-5">
          <div style={{ animationDelay: "140ms" }}>
            <SectionHeader
              title="Exportar minha vida financeira"
              subtitle="Saia da plataforma quando quiser, sem perder nada"
            />
            <div className="flex flex-wrap gap-2">
              <Button icon={<IconDownload size={15} />} onClick={exportFullJson}>
                Backup completo (JSON)
              </Button>
              <Button variant="secondary" size="sm" onClick={() => importRef.current?.click()}>
                Restaurar backup (JSON)
              </Button>
              <input
                ref={importRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importJson(file);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="mb-2 mt-4 text-[13px] font-semibold text-ink">CSV por módulo</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["transacoes", "Transações"],
                ["contas", "Contas"],
                ["cartoes", "Cartões"],
                ["investimentos", "Investimentos"],
                ["dividas", "Dívidas"],
                ["metas", "Metas"],
                ["patrimonio", "Patrimônio"],
              ].map(([key, label]) => (
                <Button key={key} variant="ghost" size="sm" onClick={() => exportModuleCsv(key)}>
                  {label}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-mut">
              O JSON inclui histórico de auditoria (criado/alterado/corrigido/estornado/cancelado) de cada
              lançamento — nada é perdido na exportação.
            </p>
          </div>
        </Card>

        <Card className="anim-rise border-down/25 p-5">
          <div style={{ animationDelay: "200ms" }}>
            <SectionHeader title="Dados e segurança" subtitle="Armazenamento local com camada de abstração" />
            <ul className="space-y-2 text-[13px] text-mut">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-up" />
                Exclusões de lançamentos são lógicas (cancelada/estornada) com trilha de auditoria imutável.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-up" />
                Em operação normal, as chaves antigas (cf1:*) permanecem intactas como backup da migração —
                elas só são removidas quando você escolhe explicitamente “Zerar sistema”.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-up" />
                A persistência usa um StorageAdapter: trocar localStorage por banco de dados exige alterar
                apenas services/storage.ts.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Não há senha neste dispositivo (app 100% local). Em produção: HTTPS, autenticação com hash
                de senha (bcrypt/argon2), 2FA/passkeys, sessões e validação também no servidor (OWASP ASVS).
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="danger" size="sm" icon={<IconAlert size={14} />} onClick={() => setConfirmReset(true)}>
                Zerar sistema
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDemo(true)}>
                Carregar dados de exemplo (opcional)
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-mut">
              Dados atuais: {appData.transactions.length} transações · {appData.investments.length} investimentos ·{" "}
              {appData.accounts.length} contas · legado v1 preservado:{" "}
              {storage.read(LEGACY_KEYS.seeded) ? "sim" : "não"}.
            </p>
          </div>
        </Card>
      </div>

      {/* Zerar sistema — operação destrutiva com confirmação reforçada */}
      <Modal
        open={confirmReset}
        onClose={() => {
          if (!resetting) setConfirmReset(false);
        }}
        title="Tem certeza que deseja zerar o sistema?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)} disabled={resetting}>
              Cancelar
            </Button>
            <Button variant="secondary" icon={<IconDownload size={15} />} onClick={exportFullJson} disabled={resetting}>
              Exportar backup antes de zerar
            </Button>
            <Button
              variant="danger"
              loading={resetting}
              onClick={() => {
                setResetting(true);
                window.setTimeout(() => {
                  // Remoção COMPLETA: todas as chaves v2 E legadas v1.
                  // Nada é regravado — o próximo acesso recria a estrutura
                  // vazia e pergunta o nome novamente (instalação nova).
                  const allKeys = new Set<string>([
                    ...Object.values(STORAGE_KEYS),
                    ...Object.values(LEGACY_KEYS),
                  ]);
                  allKeys.forEach((key) => storage.remove(key));
                  window.location.reload();
                }, 400);
              }}
            >
              Zerar sistema
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-down/10 text-down">
            <IconAlert size={20} />
          </div>
          <div className="space-y-2 text-sm leading-relaxed text-mut">
            <p>
              <strong className="text-ink">Todos os dados financeiros armazenados neste navegador serão removidos:</strong>{" "}
              transações, contas, cartões, faturas, investimentos, dívidas, metas, bens, orçamentos,
              recorrências, regras, configurações — e também o seu nome de usuário.
            </p>
            <p className="font-semibold text-down">Esta ação não poderá ser desfeita sem um backup.</p>
            <p>
              Após o reinício o sistema volta ao estado de instalação nova: tudo em R$ 0,00 e a pergunta
              “Como você quer ser chamado?” na primeira tela.
            </p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDemo}
        title="Carregar dados de exemplo"
        confirmLabel="Carregar exemplo"
        message={
          <p>
            Isso preenche o sistema com um cenário fictício (contas, cartões, investimentos, dívidas e
            metas de demonstração) apenas para você explorar as telas.{" "}
            <strong className="text-ink">Substitui os dados atuais.</strong> Depois você pode remover tudo
            em “Zerar sistema”.
          </p>
        }
        onCancel={() => setConfirmDemo(false)}
        onConfirm={() => {
          persistAll(buildSeedData());
          storage.write(STORAGE_KEYS.seeded, true);
          storage.write(STORAGE_KEYS.schemaVersion, 2);
          push("success", "Dados de exemplo carregados", "Recarregando o sistema…");
          window.setTimeout(() => window.location.reload(), 600);
        }}
      />

      <p className="mt-4 text-[11px] text-mut">
        A instalação é entregue vazia: apenas estrutura, categorias padrão e configurações. Todos os
        valores financeiros começam zerados até você cadastrar sua própria vida financeira. Moeda
        ativa: {settings.currency}.
      </p>
    </div>
  );
}
