import { useState } from "react";
import { useFinance } from "../../contexts/FinanceContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../ui/Button";
import { Logo, IconArrowUpRight, IconWallet, IconTrendUp, IconTarget } from "../ui/icons";

/**
 * Primeiro acesso: pergunta o nome UMA única vez e salva no armazenamento
 * local do navegador. Nas próximas sessões esta tela não aparece mais.
 */
export function OnboardingScreen() {
  const { updateSettings } = useFinance();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = () => {
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2) {
      setError("Digite um nome com pelo menos 2 letras.");
      return;
    }
    if (trimmed.length > 40) {
      setError("Use um nome com até 40 caracteres.");
      return;
    }
    setSaving(true);
    updateSettings({ userName: trimmed });
    push("success", `Bem-vindo, ${trimmed.split(" ")[0]}!`, "Seu nome ficou salvo neste navegador.");
  };

  return (
    <div className="flex min-h-dvh items-stretch">
      {/* Painel da marca */}
      <aside className="dotgrid relative hidden w-[46%] flex-col justify-between overflow-hidden bg-side p-10 text-sideink lg:flex">
        <span
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-pine-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="anim-rise relative flex items-center gap-3">
          <Logo size={40} />
          <div className="leading-tight">
            <p className="font-display text-lg font-bold text-paper">Controle</p>
            <p className="font-display text-lg font-bold text-pine-300">Financeiro</p>
          </div>
        </div>

        <div className="anim-rise relative max-w-md" style={{ animationDelay: "120ms" }}>
          <p className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-paper">
            Sua vida financeira,
            <br />
            <span className="text-pine-300">página em branco.</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-sidemut">
            Tudo começa zerado — sem números de exemplo. Cada saldo, gráfico e
            relatório nasce do que você cadastrar.
          </p>

          {/* Livro-razão em branco: três linhas aguardando o primeiro lançamento */}
          <div className="mt-8 space-y-2.5" aria-hidden="true">
            {[
              { icon: <IconWallet size={15} />, label: "Sua primeira conta" },
              { icon: <IconTrendUp size={15} />, label: "Seu primeiro investimento" },
              { icon: <IconTarget size={15} />, label: "Sua primeira meta" },
            ].map((row, i) => (
              <div
                key={row.label}
                className="anim-rise flex items-center gap-3 rounded-lg border border-pine-800/70 bg-side2/60 px-4 py-3"
                style={{ animationDelay: `${260 + i * 110}ms` }}
              >
                <span className="text-pine-300">{row.icon}</span>
                <span className="text-[13px] font-medium text-sidemut">{row.label}</span>
                <span className="ml-auto h-px w-16 border-b border-dashed border-pine-700" />
              </div>
            ))}
          </div>
        </div>

        <p className="anim-rise relative flex items-center gap-2 text-[11px] text-sidemut" style={{ animationDelay: "600ms" }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pine-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pine-400" />
          </span>
          100% local — seus dados ficam somente neste navegador.
        </p>
      </aside>

      {/* Formulário */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-10">
        <span
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-pine-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="anim-pop relative w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={36} />
            <div className="leading-tight">
              <p className="font-display text-base font-bold text-ink">Controle</p>
              <p className="font-display text-base font-bold text-up">Financeiro</p>
            </div>
          </div>

          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-up">Primeiro acesso</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Como você quer ser chamado?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mut">
            Usaremos seu nome para personalizar o sistema. Ele fica guardado apenas no
            armazenamento local deste navegador — junto com todos os seus dados financeiros.
          </p>

          <form
            className="mt-8"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <label htmlFor="onboarding-name" className="mb-1.5 block text-[13px] font-semibold text-ink">
              Seu nome
            </label>
            <input
              id="onboarding-name"
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Digite seu nome"
              maxLength={40}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "onboarding-name-error" : undefined}
              className={[
                "h-12 w-full rounded-xl border bg-card px-4 text-[15px] text-ink transition-colors",
                "placeholder:text-mut/50 focus:outline-none focus:ring-2",
                error
                  ? "border-down/70 focus:border-down focus:ring-down/25"
                  : "border-line focus:border-pine-500 focus:ring-pine-500/25",
              ].join(" ")}
            />
            {error ? (
              <p id="onboarding-name-error" role="alert" className="anim-fadein mt-2 text-xs font-medium text-down">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              full
              loading={saving}
              icon={<IconArrowUpRight size={16} />}
              className="mt-4 h-12 text-[15px]"
            >
              Começar
            </Button>
          </form>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-mut">
            Ao começar, o sistema abre totalmente zerado: patrimônio, contas, investimentos e
            metas em <strong className="text-ink">R$ 0,00</strong>, prontos para os seus dados reais.
          </p>
        </div>
      </main>
    </div>
  );
}
