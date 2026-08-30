import { useMemo, useRef, useState } from "react";
import { useFinance } from "../contexts/FinanceContext";
import { answerQuestion, type AssistantAnswer } from "../utils/finance";
import { Card, PageHeader } from "../components/ui/Display";
import { Button } from "../components/ui/Button";
import { IconSearch } from "../components/ui/icons";

interface ChatMessage {
  role: "user" | "system";
  text: string;
  details?: string[];
}

const SUGGESTIONS = [
  "Quanto tenho hoje?",
  "Quanto gastei com alimentação este ano?",
  "Quanto investi em 2026?",
  "Quanto recebi de dividendos?",
  "Quanto meu patrimônio cresceu?",
  "Quanto posso gastar este mês?",
  "Quais foram minhas maiores despesas?",
  "Quanto devo?",
  "Se eu investir R$ 600 por mês durante 20 anos, quanto terei?",
  "Como chegar a R$ 1.000.000?",
];

export function AssistantPage() {
  const { appData, status } = useFinance();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "system",
      text: "Olá! Sou a consulta financeira do sistema. Respondo usando exclusivamente os seus dados reais — nunca invento números. Experimente uma das perguntas abaixo ou escreva a sua.",
    },
  ]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const disabled = status !== "ready";

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || disabled) return;
    const answer: AssistantAnswer = answerQuestion(trimmed, appData);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      { role: "system", text: answer.text, details: answer.details },
    ]);
    setInput("");
    window.setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 60);
  };

  const recent = useMemo(() => messages.slice(-8), [messages]);

  return (
    <div>
      <PageHeader
        title="Pergunte ao sistema"
        subtitle="Consultas em linguagem natural sobre os seus dados — sem inventar nada"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <Card className="anim-rise flex h-[62vh] flex-col overflow-hidden">
          <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {recent.map((message, index) => (
              <div key={index} className={`anim-rise flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    message.role === "user"
                      ? "rounded-br-md bg-pine-600 text-paper"
                      : "rounded-bl-md border border-line bg-card2/70 text-ink",
                  ].join(" ")}
                >
                  <p>{message.text}</p>
                  {message.details && message.details.length > 0 ? (
                    <ul className="mt-2 space-y-1 border-t border-line/70 pt-2">
                      {message.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="tnum text-[13px] text-mut">
                          • {detail}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <form
            className="flex items-center gap-2 border-t border-line bg-card2/50 p-3.5"
            onSubmit={(event) => {
              event.preventDefault();
              ask(input);
            }}
          >
            <label htmlFor="assistant-input" className="sr-only">
              Sua pergunta
            </label>
            <input
              id="assistant-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={disabled ? "Carregando seus dados…" : "Ex.: Quanto gastei com transporte este mês?"}
              disabled={disabled}
              className="h-11 flex-1 rounded-lg border border-line bg-card px-4 text-sm text-ink placeholder:text-mut/60 focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-500/25"
            />
            <Button type="submit" disabled={disabled || input.trim().length === 0} icon={<IconSearch size={15} />}>
              Perguntar
            </Button>
          </form>
        </Card>

        <Card className="anim-rise h-fit p-5" hover>
          <div style={{ animationDelay: "100ms" }}>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-mut">Perguntas frequentes</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  disabled={disabled}
                  className="rounded-lg border border-line bg-card px-3 py-2 text-left text-[13px] font-medium text-ink transition-all duration-150 hover:-translate-y-px hover:border-pine-500/50 hover:bg-pine-500/5 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <p className="mt-4 rounded-lg border border-line bg-card2/60 p-3 text-[11px] leading-relaxed text-mut">
              As respostas usam os lançamentos, contas, investimentos, dívidas e orçamentos atuais.
              Quando não há dados suficientes, o sistema informa com clareza.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
