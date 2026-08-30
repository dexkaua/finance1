import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton, Button } from "./Button";
import { IconX, IconAlert } from "./icons";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Ref para o callback: o efeito abaixo NÃO pode depender da identidade de
  // `onClose` (que muda a cada render do pai). Se dependesse, cada tecla
  // digitada num campo do formulário re-executaria o efeito e o
  // `panelRef.focus()` roubaria o foco do input — este era o bug de
  // "campo perde o foco a cada caractere".
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div className="anim-fadein absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          "anim-pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl shadow-black/30 outline-none sm:rounded-2xl",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
        ].join(" ")}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="font-display text-lg font-semibold leading-tight text-ink">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-[13px] text-mut">{subtitle}</p> : null}
          </div>
          <IconButton label="Fechar" onClick={onClose}>
            <IconX size={18} />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <footer className="flex justify-end gap-3 border-t border-line bg-card2 px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Excluir",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-down/10 text-down">
          <IconAlert size={20} />
        </div>
        <div className="text-sm leading-relaxed text-mut">{message}</div>
      </div>
    </Modal>
  );
}
