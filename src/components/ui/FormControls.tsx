import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="anim-fadein mt-1.5 text-xs font-medium text-down">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-mut">{hint}</p>
      ) : null}
    </div>
  );
}

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export function Checkbox({ label, description, id, className = "", ...rest }: CheckboxProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-line bg-card text-pine-600 focus:ring-pine-500/25"
        {...rest}
      />
      <div className="flex-1">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {description ? (
          <p className="text-xs text-mut">{description}</p>
        ) : null}
      </div>
    </label>
  );
}

function controlClass(invalid: boolean | undefined, extra = ""): string {
  return [
    "h-10 w-full rounded-lg border bg-card px-3 text-sm text-ink transition-colors",
    "placeholder:text-mut/60 focus:outline-none focus:ring-2",
    invalid
      ? "border-down/70 focus:border-down focus:ring-down/25"
      : "border-line focus:border-pine-500 focus:ring-pine-500/25",
    extra,
  ].join(" ");
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function TextInput({ invalid, className = "", ...rest }: TextInputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, className)}
      {...rest}
    />
  );
}

export interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function SelectInput({ invalid, className = "", children, ...rest }: SelectInputProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={controlClass(invalid, `appearance-none pr-9 ${className}`)}
        {...rest}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mut"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

export interface CurrencyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
  invalid?: boolean;
}

export function CurrencyInput({
  value,
  onValueChange,
  invalid,
  placeholder = "0,00",
  className = "",
  ...rest
}: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-mut">
        R$
      </span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={controlClass(invalid, `pl-10 tnum ${className}`)}
        {...rest}
      />
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  activeClass?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-1 rounded-lg border border-line bg-card2 p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={[
              "flex-1 rounded-md px-2 py-1.5 text-[13px] font-semibold transition-all duration-150",
              active
                ? `bg-card shadow-sm border border-line ${option.activeClass ?? "text-ink"}`
                : "border border-transparent text-mut hover:text-ink",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
