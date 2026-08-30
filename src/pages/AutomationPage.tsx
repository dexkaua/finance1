import { useState } from "react";
import type { Automation, Rule } from "../types";
import { useFinance } from "../contexts/FinanceContext";
import { useToast } from "../contexts/ToastContext";
import { CATEGORIES, getCategory, rootCategoriesOf } from "../data/categories";
import { Badge, Card, PageHeader, SectionHeader } from "../components/ui/Display";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Button, IconButton } from "../components/ui/Button";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { Field, SelectInput, TextInput } from "../components/ui/FormControls";
import { IconCheck, IconPencil, IconPlus, IconSwap, IconTrash } from "../components/ui/icons";
import { uid } from "../utils/id";

export function AutomationPage() {
  const {
    status,
    rules,
    automations,
    addRule,
    updateRule,
    removeRule,
    addAutomation,
    updateAutomation,
    removeAutomation,
    refresh,
  } = useFinance();
  const { push } = useToast();

  const [ruleModal, setRuleModal] = useState(false);
  const [ruleEditing, setRuleEditing] = useState<Rule | null>(null);
  const [ruleForm, setRuleForm] = useState({ name: "", operator: "contem" as Rule["match"]["operator"], value: "", categoryId: "" });
  const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({});
  const [pendingRuleDelete, setPendingRuleDelete] = useState<Rule | null>(null);

  const [autoModal, setAutoModal] = useState(false);
  const [autoEditing, setAutoEditing] = useState<Automation | null>(null);
  const [autoName, setAutoName] = useState("");
  const [autoTrigger, setAutoTrigger] = useState("");
  const [autoSplits, setAutoSplits] = useState<Array<{ label: string; pct: string }>>([
    { label: "Investimentos", pct: "20" },
    { label: "Reserva", pct: "20" },
    { label: "Lazer", pct: "10" },
  ]);
  const [autoErrors, setAutoErrors] = useState<Record<string, string>>({});
  const [pendingAutoDelete, setPendingAutoDelete] = useState<Automation | null>(null);

  const incomeCategories = rootCategoriesOf("receita");

  const handleRuleSubmit = () => {
    const errs: Record<string, string> = {};
    if (ruleForm.name.trim().length < 3) errs.name = "Dê um nome à regra.";
    if (ruleForm.value.trim().length < 2) errs.value = "Informe o texto a buscar.";
    if (!ruleForm.categoryId) errs.categoryId = "Escolha a categoria.";
    if (Object.keys(errs).length > 0) {
      setRuleErrors(errs);
      return;
    }
    const data = {
      name: ruleForm.name.trim(),
      enabled: ruleEditing?.enabled ?? true,
      match: { field: "descricao" as const, operator: ruleForm.operator, value: ruleForm.value.trim().toUpperCase() },
      action: { type: "categoria" as const, categoryId: ruleForm.categoryId },
    };
    if (ruleEditing) {
      updateRule(ruleEditing.id, data);
      push("success", "Regra atualizada", data.name);
    } else {
      addRule(data);
      push("success", "Regra criada", `SE descrição contém “${data.match.value}” ENTÃO categoria = ${getCategory(ruleForm.categoryId)?.label}`);
    }
    setRuleModal(false);
  };

  const handleAutoSubmit = () => {
    const errs: Record<string, string> = {};
    if (autoName.trim().length < 3) errs.name = "Dê um nome à automação.";
    if (!autoTrigger) errs.trigger = "Escolha a categoria-gatilho.";
    const totalPct = autoSplits.reduce((acc, split) => acc + (Number(split.pct.replace(",", ".")) || 0), 0);
    if (totalPct <= 0 || totalPct > 100) errs.splits = `A soma das divisões é ${totalPct}% (máx. 100%).`;
    if (Object.keys(errs).length > 0) {
      setAutoErrors(errs);
      return;
    }
    const splits = autoSplits.map((split) => {
      const isInvest = split.label.toLowerCase().includes("invest");
      return {
        id: uid("split"),
        label: split.label,
        pct: Number(split.pct.replace(",", ".")) || 0,
        kind: isInvest ? ("aporte" as const) : ("despesa" as const),
        categoryId: isInvest
          ? "aportes"
          : split.label.toLowerCase().includes("reserva")
            ? "reserva"
            : "lazer",
      };
    });
    const data = { name: autoName.trim(), enabled: autoEditing?.enabled ?? true, triggerCategoryId: autoTrigger, splits };
    if (autoEditing) {
      updateAutomation(autoEditing.id, data);
      push("success", "Automação atualizada", data.name);
    } else {
      addAutomation(data);
      push("success", "Automação criada", `Ao receber em ${getCategory(autoTrigger)?.label}, os lançamentos serão divididos automaticamente.`);
    }
    setAutoModal(false);
  };

  if (status === "error") return <ErrorState onRetry={() => void refresh()} />;

  return (
    <div>
      <PageHeader title="Automação e regras" subtitle="Regras de categorização e divisões automáticas — aplicadas apenas a lançamentos manuais">
        <Button variant="secondary" size="sm" icon={<IconPlus size={15} />} onClick={() => {
          setAutoEditing(null);
          setAutoName("");
          setAutoTrigger("");
          setAutoSplits([
            { label: "Investimentos", pct: "20" },
            { label: "Reserva", pct: "20" },
            { label: "Lazer", pct: "10" },
          ]);
          setAutoErrors({});
          setAutoModal(true);
        }}>
          Nova automação
        </Button>
        <Button size="sm" icon={<IconPlus size={15} />} onClick={() => {
          setRuleEditing(null);
          setRuleForm({ name: "", operator: "contem", value: "", categoryId: "" });
          setRuleErrors({});
          setRuleModal(true);
        }}>
          Nova regra
        </Button>
      </PageHeader>

      {status === "loading" ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="anim-rise p-5">
            <SectionHeader title="Regras inteligentes" subtitle="SE descrição contém X ENTÃO categoria = Y" />
            {rules.length === 0 ? (
              <EmptyState compact icon={<IconSwap size={20} />} title="Nenhuma regra" description="Ex.: SE descrição contém “UBER” ENTÃO categoria = Transporte." />
            ) : (
              <ul className="space-y-2.5">
                {rules.map((rule) => (
                  <li key={rule.id} className={`flex items-center justify-between gap-2 rounded-xl border border-line bg-card2/50 px-3.5 py-3 ${!rule.enabled ? "opacity-55" : ""}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{rule.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-mut">
                        SE descrição {rule.match.operator} "{rule.match.value}" → {getCategory(rule.action.categoryId)?.label ?? rule.action.categoryId}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.enabled}
                        aria-label={`Ativar regra ${rule.name}`}
                        onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                        className={`relative h-5.5 w-10 rounded-full transition-colors ${rule.enabled ? "bg-pine-600" : "bg-ink/15"}`}
                        style={{ height: 22 }}
                      >
                        <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-paper shadow transition-all ${rule.enabled ? "left-[21px]" : "left-0.5"}`} />
                      </button>
                      <IconButton label={`Editar ${rule.name}`} size="sm" onClick={() => {
                        setRuleEditing(rule);
                        setRuleForm({ name: rule.name, operator: rule.match.operator, value: rule.match.value, categoryId: rule.action.categoryId });
                        setRuleErrors({});
                        setRuleModal(true);
                      }}>
                        <IconPencil size={15} />
                      </IconButton>
                      <IconButton label={`Excluir ${rule.name}`} size="sm" tone="danger" onClick={() => setPendingRuleDelete(rule)}>
                        <IconTrash size={15} />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="anim-rise p-5" >
            <div style={{ animationDelay: "80ms" }}>
              <SectionHeader title="Automações de divisão" subtitle="Ex.: todo salário vira aportes, reserva e lazer automaticamente" />
              {automations.length === 0 ? (
                <EmptyState compact icon={<IconSwap size={20} />} title="Nenhuma automação" description="“Quando entrar salário, dividir 50/20/20/10” — crie a sua." />
              ) : (
                <ul className="space-y-2.5">
                  {automations.map((automation) => (
                    <li key={automation.id} className={`rounded-xl border border-line bg-card2/50 px-3.5 py-3 ${!automation.enabled ? "opacity-55" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">{automation.name}</p>
                          <p className="mt-0.5 text-[11px] text-mut">
                            Gatilho: categoria {getCategory(automation.triggerCategoryId)?.label ?? automation.triggerCategoryId}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={automation.enabled}
                            aria-label={`Ativar automação ${automation.name}`}
                            onClick={() => updateAutomation(automation.id, { enabled: !automation.enabled })}
                            className="relative w-10 rounded-full transition-colors"
                            style={{ height: 22, backgroundColor: automation.enabled ? "var(--up)" : "color-mix(in oklab, var(--ink) 15%, transparent)" }}
                          >
                            <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-paper shadow transition-all ${automation.enabled ? "left-[21px]" : "left-0.5"}`} />
                          </button>
                          <IconButton label={`Editar ${automation.name}`} size="sm" onClick={() => {
                            setAutoEditing(automation);
                            setAutoName(automation.name);
                            setAutoTrigger(automation.triggerCategoryId);
                            setAutoSplits(automation.splits.map((split) => ({ label: split.label, pct: String(split.pct).replace(".", ",") })));
                            setAutoErrors({});
                            setAutoModal(true);
                          }}>
                            <IconPencil size={15} />
                          </IconButton>
                          <IconButton label={`Excluir ${automation.name}`} size="sm" tone="danger" onClick={() => setPendingAutoDelete(automation)}>
                            <IconTrash size={15} />
                          </IconButton>
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {automation.splits.map((split) => (
                          <Badge key={split.id} tone={split.kind === "aporte" ? "inv" : "gold"}>
                            {split.label} {split.pct}%
                          </Badge>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={ruleModal}
        onClose={() => setRuleModal(false)}
        title={ruleEditing ? "Editar regra" : "Nova regra"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRuleModal(false)}>Cancelar</Button>
            <Button onClick={handleRuleSubmit}>{ruleEditing ? "Salvar" : "Criar regra"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field id="rule-name" label="Nome" error={ruleErrors.name}>
            <TextInput id="rule-name" value={ruleForm.name} onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Uber → Transporte" invalid={Boolean(ruleErrors.name)} maxLength={60} />
          </Field>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field id="rule-op" label="Operador">
              <SelectInput id="rule-op" value={ruleForm.operator} onChange={(e) => setRuleForm((f) => ({ ...f, operator: e.target.value as Rule["match"]["operator"] }))}>
                <option value="contem">contém</option>
                <option value="comeca">começa com</option>
                <option value="igual">igual a</option>
              </SelectInput>
            </Field>
            <Field id="rule-value" label="Texto na descrição" error={ruleErrors.value}>
              <TextInput id="rule-value" value={ruleForm.value} onChange={(e) => setRuleForm((f) => ({ ...f, value: e.target.value }))} placeholder="Ex.: UBER" invalid={Boolean(ruleErrors.value)} maxLength={40} />
            </Field>
          </div>
          <Field id="rule-cat" label="Categoria de destino" error={ruleErrors.categoryId}>
            <SelectInput id="rule-cat" value={ruleForm.categoryId} onChange={(e) => setRuleForm((f) => ({ ...f, categoryId: e.target.value }))} invalid={Boolean(ruleErrors.categoryId)}>
              <option value="">Selecione…</option>
              {CATEGORIES.filter((c) => c.kind === "despesa").map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </Modal>

      <Modal
        open={autoModal}
        onClose={() => setAutoModal(false)}
        title={autoEditing ? "Editar automação" : "Nova automação"}
        subtitle="Quando uma receita da categoria-gatilho for lançada, as divisões são criadas automaticamente."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAutoModal(false)}>Cancelar</Button>
            <Button onClick={handleAutoSubmit}>{autoEditing ? "Salvar" : "Criar automação"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field id="auto-name" label="Nome" error={autoErrors.name}>
            <TextInput id="auto-name" value={autoName} onChange={(e) => setAutoName(e.target.value)} placeholder="Ex.: Divisão do salário" invalid={Boolean(autoErrors.name)} maxLength={60} />
          </Field>
          <Field id="auto-trigger" label="Quando receber na categoria" error={autoErrors.trigger}>
            <SelectInput id="auto-trigger" value={autoTrigger} onChange={(e) => setAutoTrigger(e.target.value)} invalid={Boolean(autoErrors.trigger)}>
              <option value="">Selecione…</option>
              {incomeCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </SelectInput>
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">Dividir em</p>
            <div className="space-y-2">
              {autoSplits.map((split, index) => (
                <div key={index} className="flex items-center gap-2">
                  <TextInput
                    value={split.label}
                    onChange={(e) => setAutoSplits((prev) => prev.map((s, i) => (i === index ? { ...s, label: e.target.value } : s)))}
                    placeholder="Rótulo"
                    aria-label={`Rótulo da divisão ${index + 1}`}
                    className="flex-1"
                  />
                  <div className="w-24">
                    <TextInput
                      value={split.pct}
                      inputMode="decimal"
                      onChange={(e) => setAutoSplits((prev) => prev.map((s, i) => (i === index ? { ...s, pct: e.target.value } : s)))}
                      aria-label={`Percentual da divisão ${index + 1}`}
                    />
                  </div>
                  <span className="text-sm font-bold text-mut">%</span>
                  <IconButton
                    label="Remover divisão"
                    size="sm"
                    tone="danger"
                    onClick={() => setAutoSplits((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <IconTrash size={14} />
                  </IconButton>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAutoSplits((prev) => [...prev, { label: "", pct: "10" }])}
              className="mt-2 text-xs font-semibold text-inv hover:underline"
            >
              + Adicionar divisão
            </button>
            {autoErrors.splits ? <p role="alert" className="mt-1.5 text-xs font-medium text-down">{autoErrors.splits}</p> : null}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingRuleDelete !== null}
        title="Excluir regra"
        message={<p>Excluir a regra <strong className="text-ink">{pendingRuleDelete?.name}</strong>?</p>}
        onCancel={() => setPendingRuleDelete(null)}
        onConfirm={() => {
          if (pendingRuleDelete) {
            removeRule(pendingRuleDelete.id);
            push("success", "Regra excluída", pendingRuleDelete.name);
          }
          setPendingRuleDelete(null);
        }}
      />
      <ConfirmDialog
        open={pendingAutoDelete !== null}
        title="Excluir automação"
        message={<p>Excluir a automação <strong className="text-ink">{pendingAutoDelete?.name}</strong>? Lançamentos já criados permanecem.</p>}
        onCancel={() => setPendingAutoDelete(null)}
        onConfirm={() => {
          if (pendingAutoDelete) {
            removeAutomation(pendingAutoDelete.id);
            push("success", "Automação excluída", pendingAutoDelete.name);
          }
          setPendingAutoDelete(null);
        }}
      />

      <div className="sr-only"><IconCheck size={1} /></div>
    </div>
  );
}
