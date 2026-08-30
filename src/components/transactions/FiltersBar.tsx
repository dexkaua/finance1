import type { Category, PeriodPreset, TransactionFilters, TxKind } from "../../types";
import { KIND_META } from "../../data/categories";
import { Button } from "../ui/Button";
import { SelectInput, TextInput } from "../ui/FormControls";
import { IconSearch, IconX } from "../ui/icons";

const PERIOD_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "tudo", label: "Todo o período" },
  { value: "mes", label: "Este mês" },
  { value: "mes-passado", label: "Mês passado" },
  { value: "3meses", label: "Últimos 3 meses" },
  { value: "ano", label: "Este ano" },
  { value: "personalizado", label: "Personalizado" },
];

const KIND_ORDER: TxKind[] = [
  "receita", "despesa", "transferencia", "aporte", "resgate",
  "dividendo", "juros", "taxa", "estorno", "ajuste",
];

export interface FiltersBarProps {
  filters: TransactionFilters;
  categories: Category[];
  accountNames: Map<string, string>;
  hasActiveFilters: boolean;
  onChange: (patch: Partial<TransactionFilters>) => void;
  onClear: () => void;
}

export function FiltersBar({
  filters,
  categories,
  accountNames,
  hasActiveFilters,
  onChange,
  onClear,
}: FiltersBarProps) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr]">
        <div className="relative">
          <label htmlFor="filter-search" className="sr-only">Buscar por descrição</label>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut">
            <IconSearch size={16} />
          </span>
          <TextInput
            id="filter-search"
            className="pl-9"
            placeholder="Buscar por descrição…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="filter-kind" className="sr-only">Filtrar por tipo</label>
          <SelectInput
            id="filter-kind"
            value={filters.kind}
            onChange={(e) => onChange({ kind: e.target.value as TxKind | "todas" })}
          >
            <option value="todas">Todos os tipos</option>
            {KIND_ORDER.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_META[kind].plural}
              </option>
            ))}
          </SelectInput>
        </div>

        <div>
          <label htmlFor="filter-category" className="sr-only">Filtrar por categoria</label>
          <SelectInput
            id="filter-category"
            value={filters.categoryId}
            onChange={(e) => onChange({ categoryId: e.target.value })}
          >
            <option value="todas">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </SelectInput>
        </div>

        <div>
          <label htmlFor="filter-account" className="sr-only">Filtrar por conta</label>
          <SelectInput
            id="filter-account"
            value={filters.accountId}
            onChange={(e) => onChange({ accountId: e.target.value })}
          >
            <option value="todas">Todas as contas</option>
            {Array.from(accountNames.entries()).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </SelectInput>
        </div>

        <div>
          <label htmlFor="filter-period" className="sr-only">Filtrar por período</label>
          <SelectInput
            id="filter-period"
            value={filters.period}
            onChange={(e) => onChange({ period: e.target.value as PeriodPreset })}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>

      {filters.period === "personalizado" ? (
        <div className="anim-fadein mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13px] font-medium text-mut">
            De
            <TextInput
              type="date"
              value={filters.from}
              onChange={(e) => onChange({ from: e.target.value })}
              style={{ width: 165 }}
              aria-label="Data inicial"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] font-medium text-mut">
            até
            <TextInput
              type="date"
              value={filters.to}
              onChange={(e) => onChange({ to: e.target.value })}
              style={{ width: 165 }}
              aria-label="Data final"
            />
          </label>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-mut">
          <input
            type="checkbox"
            checked={filters.includeInactive}
            onChange={(e) => onChange({ includeInactive: e.target.checked })}
            className="h-3.5 w-3.5 accent-[#1d6e4e]"
          />
          Mostrar canceladas e estornadas
        </label>
        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" icon={<IconX size={14} />} onClick={onClear}>
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </div>
  );
}
