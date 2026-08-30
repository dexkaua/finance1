import type { Category, PeriodPreset, TransactionFilters, TransactionType } from "../../types";
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

export interface FiltersBarProps {
  filters: TransactionFilters;
  categories: Category[];
  hasActiveFilters: boolean;
  onChange: (patch: Partial<TransactionFilters>) => void;
  onClear: () => void;
}

export function FiltersBar({
  filters,
  categories,
  hasActiveFilters,
  onChange,
  onClear,
}: FiltersBarProps) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div className="relative">
          <label htmlFor="filter-search" className="sr-only">
            Buscar por descrição
          </label>
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
          <label htmlFor="filter-type" className="sr-only">
            Filtrar por tipo
          </label>
          <SelectInput
            id="filter-type"
            value={filters.type}
            onChange={(e) => onChange({ type: e.target.value as TransactionType | "todas" })}
          >
            <option value="todas">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
            <option value="investimento">Aportes</option>
          </SelectInput>
        </div>

        <div>
          <label htmlFor="filter-category" className="sr-only">
            Filtrar por categoria
          </label>
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
          <label htmlFor="filter-period" className="sr-only">
            Filtrar por período
          </label>
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

      {hasActiveFilters ? (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" icon={<IconX size={14} />} onClick={onClear}>
            Limpar filtros
          </Button>
        </div>
      ) : null}
    </div>
  );
}
