import { Check, Search, SlidersHorizontal, UserRoundCheck, X } from 'lucide-react';
import { Input } from '../ui/Input.jsx';
import { Select } from '../ui/Select.jsx';
import {
  STATUS_LABELS,
  STATUS_ORDER,
  URGENCIES,
  URGENCY_LABELS,
} from '../../utils/constants.js';
import './tickets.css';

const DEFAULT_ORDERING = '-created_at';

const ORDERING_OPTIONS = [
  { value: '-created_at', label: 'Mais recentes' },
  { value: 'created_at', label: 'Mais antigos' },
  { value: '-urgency', label: 'Maior urgência' },
  { value: 'urgency', label: 'Menor urgência' },
];

export function TicketFilters({
  filters,
  onChange,
  onClear,
  categories = [],
  assignees = [],
  showAssignee = false,
  showOrdering = true,
  showMine = false,
  mineLabel = 'Meus chamados',
  idPrefix = 'filters',
}) {
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.status ||
      filters.urgency ||
      filters.category ||
      filters.assignee ||
      filters.mine,
  );

  const categoryOptions = categories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }));

  return (
    <form
      className="ticket-filters"
      role="search"
      aria-label="Filtros de chamados"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="ticket-filters__field ticket-filters__field--search">
        <Input
          id={`${idPrefix}-search`}
          label="Buscar"
          type="search"
          placeholder="Título ou identificador"
          value={filters.search}
          onChange={(event) => onChange('search', event.target.value)}
          autoComplete="off"
        />
      </div>

      {showMine ? (
        <label
          className={`filter-toggle ${filters.mine ? 'is-active' : ''}`.trim()}
          htmlFor={`${idPrefix}-mine`}
        >
          <input
            id={`${idPrefix}-mine`}
            type="checkbox"
            className="filter-toggle__input"
            checked={Boolean(filters.mine)}
            onChange={(event) => onChange('mine', event.target.checked)}
          />
          <span className="filter-toggle__box" aria-hidden="true">
            {filters.mine ? <Check size={12} /> : <UserRoundCheck size={12} />}
          </span>
          <span>{mineLabel}</span>
        </label>
      ) : null}

      <div className="ticket-filters__field">
        <Select
          id={`${idPrefix}-status`}
          label="Status"
          value={filters.status}
          onChange={(event) => onChange('status', event.target.value)}
          options={STATUS_ORDER.map((status) => ({
            value: status,
            label: STATUS_LABELS[status],
          }))}
          placeholder="Todos os status"
        />
      </div>

      <div className="ticket-filters__field">
        <Select
          id={`${idPrefix}-urgency`}
          label="Urgência"
          value={filters.urgency}
          onChange={(event) => onChange('urgency', event.target.value)}
          options={URGENCIES.map((urgency) => ({
            value: urgency,
            label: URGENCY_LABELS[urgency],
          }))}
          placeholder="Todas as urgências"
        />
      </div>

      <div className="ticket-filters__field">
        <Select
          id={`${idPrefix}-category`}
          label="Categoria"
          value={filters.category}
          onChange={(event) => onChange('category', event.target.value)}
          options={categoryOptions}
          placeholder="Todas as categorias"
        />
      </div>

      {showAssignee ? (
        <div className="ticket-filters__field">
          <Select
            id={`${idPrefix}-assignee`}
            label="Responsável"
            value={filters.assignee}
            onChange={(event) => onChange('assignee', event.target.value)}
            placeholder="Todos os responsáveis"
          >
            <option value="">Todos os responsáveis</option>
            <option value="me">Atribuídos a mim</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={String(assignee.id)}>
                {assignee.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {showOrdering ? (
        <div className="ticket-filters__field ticket-filters__field--ordering">
          <Select
            id={`${idPrefix}-ordering`}
            label="Ordenar por"
            value={filters.ordering || DEFAULT_ORDERING}
            onChange={(event) => onChange('ordering', event.target.value)}
            options={ORDERING_OPTIONS}
          />
        </div>
      ) : null}

      <div className="ticket-filters__actions">
        {hasActiveFilters ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onClear}
            aria-label="Limpar todos os filtros"
          >
            <X size={14} aria-hidden="true" />
            Limpar filtros
          </button>
        ) : (
          <span className="ticket-filters__hint">
            <SlidersHorizontal size={14} aria-hidden="true" />
            Sem filtros aplicados
          </span>
        )}
      </div>
    </form>
  );
}
