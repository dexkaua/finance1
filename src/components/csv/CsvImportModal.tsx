import { useMemo, useRef, useState } from "react";
import type { Account, CreditCard, TransactionInput, TxKind } from "../../types";
import { useFinance } from "../../contexts/FinanceContext";
import { useToast } from "../../contexts/ToastContext";
import { parseCsv, parseCsvAmount, parseCsvDate } from "../../utils/csv";
import { normalizeText } from "../../utils/finance";
import { Badge, ProgressBar } from "../ui/Display";
import { Button } from "../ui/Button";
import { Checkbox, Field, SelectInput, TextInput } from "../ui/FormControls";
import { Modal } from "../ui/Modal";
import { IconAlert } from "../ui/icons";

interface Mapping {
  date: string;
  description: string;
  amount: string;
  kind: string;
  installments: string;
}

type Step = "file" | "mapping" | "review";

export function CsvImportModal({
  open,
  accounts,
  cards,
  defaultAccountId,
  onClose,
}: {
  open: boolean;
  accounts: Account[];
  cards: CreditCard[];
  defaultAccountId: string;
  onClose: () => void;
}) {
  const { importTransactions, createInstallmentPurchase, transactions } = useFinance();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("file");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping>({ date: "", description: "", amount: "", kind: "", installments: "" });
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [cardId, setCardId] = useState<string>("");
  const [defaultKind, setDefaultKind] = useState<TxKind>("despesa");
  const [isCreditCardImport, setIsCreditCardImport] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setStep("file");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({ date: "", description: "", amount: "", kind: "", installments: "" });
    setAccountId(defaultAccountId);
    setCardId("");
    setDefaultKind("despesa");
    setIsCreditCardImport(false);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result ?? ""));
        if (parsed.headers.length === 0 || parsed.rows.length === 0) {
          push("error", "CSV inválido", "O arquivo não tem linhas de dados.");
          return;
        }
        setHeaders(parsed.headers);
        setRows(parsed.rows);
        setFileName(file.name);
        // Pré-mapeamento heurístico
        const lower = parsed.headers.map((h) => normalizeText(h));
        setMapping({
          date: parsed.headers[lower.findIndex((h) => h.includes("data"))] ?? "",
          description:
            parsed.headers[lower.findIndex((h) => h.includes("desc") || h.includes("hist") || h.includes("lanc"))] ?? "",
          amount:
            parsed.headers[lower.findIndex((h) => h.includes("valor") || h.includes("amount"))] ?? "",
          kind: parsed.headers[lower.findIndex((h) => h.includes("tipo"))] ?? "",
          installments: parsed.headers[lower.findIndex((h) => h.includes("parcel") || h.includes("vez"))] ?? "",
        });
        setStep("mapping");
      } catch {
        push("error", "Falha ao ler arquivo", "Verifique se é um CSV válido.");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const preview = useMemo(() => {
    if (step !== "review" || !mapping.date || !mapping.description || !mapping.amount) return null;
    const di = headers.indexOf(mapping.date);
    const dsi = headers.indexOf(mapping.description);
    const ai = headers.indexOf(mapping.amount);
    const ki = mapping.kind ? headers.indexOf(mapping.kind) : -1;
    const ii = mapping.installments ? headers.indexOf(mapping.installments) : -1;

    const items: Array<{ input: TransactionInput | null; duplicate: boolean; invalid: string | null; installments?: number }> =
      rows.map((row) => {
        const date = parseCsvDate(row[di] ?? "");
        const description = (row[dsi] ?? "").trim();
        const rawAmount = parseCsvAmount(row[ai] ?? "");
        const kindCell = ki >= 0 ? normalizeText(row[ki] ?? "") : "";
        const kind: TxKind =
          kindCell.includes("receita") || kindCell.includes("credito") || kindCell.includes("deposito")
            ? "receita"
            : kindCell.includes("aporte")
              ? "aporte"
              : defaultKind;

        let installments: number | undefined;
        if (isCreditCardImport && ii >= 0) {
          const instVal = parseInt(row[ii]?.replace(/[^0-9]/g, "") || "1", 10);
          if (!isNaN(instVal) && instVal > 1) installments = instVal;
        }

        if (!date) return { input: null, duplicate: false, invalid: "Data inválida" };
        if (description.length < 2) return { input: null, duplicate: false, invalid: "Sem descrição" };
        if (rawAmount === null) return { input: null, duplicate: false, invalid: "Valor inválido" };

        const amount = Math.abs(rawAmount);
        const duplicate = transactions.some(
          (tx) => tx.date === date && Math.abs(tx.amount - amount) < 0.005 && tx.description === description,
        );

        return {
          input: {
            kind,
            description,
            amount,
            categoryId: kind === "receita" ? "outras-receitas" : "outras-despesas",
            date,
            accountId: isCreditCardImport && cardId ? cardId : accountId,
            paymentMethod: isCreditCardImport ? "credito" : "transferencia",
            cardId: isCreditCardImport && cardId ? cardId : undefined,
            note: `Importado de ${fileName}.`,
          },
          duplicate,
          invalid: null,
          installments,
        };
      });
    const valid = items.filter((i) => i.input && !i.duplicate);
    const duplicates = items.filter((i) => i.duplicate);
    const invalid = items.filter((i) => i.invalid);
    return { items, valid, duplicates, invalid };
  }, [step, mapping, headers, rows, defaultKind, accountId, isCreditCardImport, cardId, transactions, fileName]);

  const stepIndex = step === "file" ? 0 : step === "mapping" ? 1 : 2;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Importar CSV"
      subtitle="Fatura, extrato ou movimentações — nada é gravado sem sua revisão."
      size="lg"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancelar
          </Button>
          {step === "mapping" ? (
            <Button
              onClick={() => setStep("review")}
              disabled={!mapping.date || !mapping.description || !mapping.amount}
            >
              Revisar dados
            </Button>
          ) : null}
          {step === "review" ? (
            <Button
              loading={importing}
              disabled={!preview || preview.valid.length === 0}
              onClick={() => {
                if (!preview) return;
                setImporting(true);
                
                let count = 0;
                const validItems = preview.valid;
                
                if (isCreditCardImport && cardId) {
                  // Processar como importação de cartão de crédito com parcelas
                  validItems.forEach((item) => {
                    const input = item.input as TransactionInput;
                    const installments = item.installments;
                    
                    if (installments && installments > 1) {
                      createInstallmentPurchase(input, installments);
                      count += installments;
                    } else {
                      importTransactions([input]);
                      count += 1;
                    }
                  });
                } else {
                  // Importação normal
                  count = importTransactions(validItems.map((v) => v.input as TransactionInput));
                }
                
                window.setTimeout(() => {
                  setImporting(false);
                  push("success", "Importação concluída", `${count} lançamentos importados; ${preview.duplicates.length} duplicadas ignoradas.`);
                  reset();
                  onClose();
                }, 350);
              }}
            >
              Confirmar importação
            </Button>
          ) : null}
        </>
      }
    >
      <div className="mb-4 flex items-center gap-2">
        {["Arquivo", "Mapeamento", "Revisão"].map((label, index) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                index <= stepIndex ? "bg-pine-600 text-paper" : "bg-ink/8 text-mut"
              }`}
            >
              {index + 1}
            </span>
            <span className={`text-xs font-semibold ${index <= stepIndex ? "text-ink" : "text-mut"}`}>
              {label}
            </span>
            {index < 2 ? <span className="h-px flex-1 bg-line" /> : null}
          </div>
        ))}
      </div>

      {step === "file" ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="dotgrid flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-linestrong py-12 text-center transition-colors hover:border-pine-500 hover:bg-pine-500/5"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-mut" aria-hidden="true">
            <path d="M12 16V4" />
            <path d="M7 9l5-5 5 5" />
            <path d="M4 20h16" />
          </svg>
          <span className="text-sm font-semibold text-ink">Escolher arquivo CSV</span>
          <span className="text-xs text-mut">
            Aceita separador “;” ou “,”, datas dd/mm/aaaa e valores 1.234,56
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </button>
      ) : null}

      {step === "mapping" ? (
        <div className="space-y-4">
          <p className="text-[13px] text-mut">
            <strong className="text-ink">{fileName}</strong> — {rows.length} linhas encontradas.
            Mapeie as colunas do arquivo:
          </p>
          
          <div className="rounded-lg border border-pine-500/30 bg-pine-500/5 p-3">
            <Checkbox
              id="credit-card-import"
              checked={isCreditCardImport}
              onChange={(e) => setIsCreditCardImport(e.target.checked)}
              label="Importar como fatura de cartão de crédito"
              description="Se marcado, você poderá selecionar o cartão e identificar parcelas para lançar nas próximas faturas."
            />
          </div>
          
          {isCreditCardImport && (
            <Field id="map-card" label="Cartão de crédito">
              <SelectInput id="map-card" value={cardId} onChange={(e) => setCardId(e.target.value)}>
                <option value="">Selecione o cartão…</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>{card.name} ({card.bank})</option>
                ))}
              </SelectInput>
            </Field>
          )}
          
          <div className={`grid ${isCreditCardImport ? "grid-cols-2" : "grid-cols-2"} gap-3`}>
            <Field id="map-date" label="Coluna de data">
              <SelectInput id="map-date" value={mapping.date} onChange={(e) => setMapping((m) => ({ ...m, date: e.target.value }))}>
                <option value="">Selecione…</option>
                {headers.map((header) => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </SelectInput>
            </Field>
            <Field id="map-desc" label="Coluna de descrição">
              <SelectInput id="map-desc" value={mapping.description} onChange={(e) => setMapping((m) => ({ ...m, description: e.target.value }))}>
                <option value="">Selecione…</option>
                {headers.map((header) => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </SelectInput>
            </Field>
            <Field id="map-amount" label="Coluna de valor">
              <SelectInput id="map-amount" value={mapping.amount} onChange={(e) => setMapping((m) => ({ ...m, amount: e.target.value }))}>
                <option value="">Selecione…</option>
                {headers.map((header) => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </SelectInput>
            </Field>
            <Field id="map-kind" label="Coluna de tipo (opcional)">
              <SelectInput id="map-kind" value={mapping.kind} onChange={(e) => setMapping((m) => ({ ...m, kind: e.target.value }))}>
                <option value="">Sem coluna — usar padrão</option>
                {headers.map((header) => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </SelectInput>
            </Field>
            <Field id="map-account" label="Conta de destino">
              <SelectInput 
                id="map-account" 
                value={accountId} 
                onChange={(e) => setAccountId(e.target.value)}
                disabled={isCreditCardImport && !!cardId}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.institution}</option>
                ))}
              </SelectInput>
            </Field>
            {!isCreditCardImport && (
              <Field id="map-default-kind" label="Tipo padrão">
                <SelectInput id="map-default-kind" value={defaultKind} onChange={(e) => setDefaultKind(e.target.value as TxKind)}>
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                  <option value="aporte">Aporte</option>
                </SelectInput>
              </Field>
            )}
            {isCreditCardImport && mapping.installments && (
              <Field id="map-installments" label="Coluna de parcelas (opcional)">
                <SelectInput id="map-installments" value={mapping.installments} onChange={(e) => setMapping((m) => ({ ...m, installments: e.target.value }))}>
                  <option value="">Sem coluna de parcelas</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </SelectInput>
              </Field>
            )}
          </div>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-card2">
                <tr>
                  {headers.map((header) => (
                    <th key={header} className="px-3 py-2 font-bold text-mut">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.slice(0, 4).map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-1.5 text-ink">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {step === "review" && preview ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-up/30 bg-up/5 p-3 text-center">
              <p className="tnum font-display text-xl font-bold text-up">{preview.valid.length}</p>
              <p className="text-[11px] font-semibold text-mut">serão importadas</p>
            </div>
            <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-center">
              <p className="tnum font-display text-xl font-bold text-gold">{preview.duplicates.length}</p>
              <p className="text-[11px] font-semibold text-mut">duplicadas (ignoradas)</p>
            </div>
            <div className="rounded-lg border border-down/30 bg-down/5 p-3 text-center">
              <p className="tnum font-display text-xl font-bold text-down">{preview.invalid.length}</p>
              <p className="text-[11px] font-semibold text-mut">inválidas</p>
            </div>
          </div>
          <ProgressBar
            value={rows.length > 0 ? preview.valid.length / rows.length : 0}
            color="var(--up)"
          />
          {preview.duplicates.length > 0 ? (
            <p className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-ink">
              <IconAlert size={15} className="mt-0.5 shrink-0 text-gold" />
              Duplicadas detectadas (mesma data, descrição e valor já existentes) não serão
              importadas — seus dados atuais nunca são alterados.
            </p>
          ) : null}
          <div className="max-h-56 overflow-y-auto rounded-lg border border-line">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-card2">
                <tr>
                  <th className="px-3 py-2 font-bold text-mut">Status</th>
                  <th className="px-3 py-2 font-bold text-mut">Data</th>
                  <th className="px-3 py-2 font-bold text-mut">Descrição</th>
                  <th className="px-3 py-2 text-right font-bold text-mut">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.items.slice(0, 30).map((item, i) => (
                  <tr key={i} className={item.duplicate || item.invalid ? "opacity-60" : ""}>
                    <td className="px-3 py-1.5">
                      {item.invalid ? (
                        <Badge tone="down">{item.invalid}</Badge>
                      ) : item.duplicate ? (
                        <Badge tone="gold">Duplicada</Badge>
                      ) : (
                        <Badge tone="up">Nova</Badge>
                      )}
                    </td>
                    <td className="tnum px-3 py-1.5 text-mut">{item.input?.date ?? "—"}</td>
                    <td className="px-3 py-1.5 font-medium text-ink">{item.input?.description ?? "—"}</td>
                    <td className="tnum px-3 py-1.5 text-right font-semibold text-ink">
                      {item.input ? item.input.amount.toFixed(2).replace(".", ",") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
