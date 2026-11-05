import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Columns3, PlusCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCategories } from '../hooks/useCategories.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useTickets } from '../hooks/useTickets.js';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { TicketFilters } from '../components/tickets/TicketFilters.jsx';
import { TicketTable } from '../components/tickets/TicketTable.jsx';
import { ROLES } from '../utils/constants.js';
import './pages.css';

const PAGE_SIZE = 10;

const DEFAULT_FILTERS = {
  search: '',
  status: '',
  urgency: '',
  category: '',
  ordering: '-created_at',
  mine: false,
};

export function TicketListPage() {
  const { user } = useAuth();
  const isTechnician = user?.role === ROLES.TECHNICIAN;

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(filters.search, 350);
  const { categories } = useCategories();

  const query = useMemo(
    () => ({
      search: debouncedSearch.trim(),
      status: filters.status,
      urgency: filters.urgency,
      category: filters.category,
      ordering: filters.ordering,
      mine: filters.mine,
      page,
      page_size: PAGE_SIZE,
    }),
    [
      debouncedSearch,
      filters.status,
      filters.urgency,
      filters.category,
      filters.ordering,
      filters.mine,
      page,
    ],
  );

  const { tickets, count, loading, error, reload, hasNext, hasPrevious } = useTickets(query);

  const mineActive = isTechnician && filters.mine;

  const title = mineActive
    ? 'Meus chamados'
    : isTechnician
      ? 'Todos os chamados'
      : 'Meus chamados';

  const description = mineActive
    ? 'Chamados atribuídos a você, incluindo os que aguardam confirmação do solicitante.'
    : isTechnician
      ? 'Consulte todos os chamados da central e acompanhe o andamento de cada atendimento.'
      : 'Acompanhe o status e o histórico dos chamados que você abriu.';

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.urgency || filters.category || filters.mine,
  );

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  function handleFilterChange(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={isTechnician ? 'Suporte' : 'Solicitante'}
        title={title}
        description={description}
        actions={
          isTechnician ? (
            <>
              <Button as={Link} to="/kanban" variant="secondary">
                <Columns3 size={16} aria-hidden="true" />
                Kanban
              </Button>
              <Button as={Link} to="/chamados/novo">
                <PlusCircle size={16} aria-hidden="true" />
                Abrir chamado
              </Button>
            </>
          ) : (
            <Button as={Link} to="/chamados/novo">
              <PlusCircle size={16} aria-hidden="true" />
              Abrir chamado
            </Button>
          )
        }
      />

      <TicketFilters
        filters={filters}
        onChange={handleFilterChange}
        onClear={clearFilters}
        categories={categories}
        showMine={isTechnician}
        mineLabel="Meus chamados"
      />

      <TicketTable
        tickets={tickets}
        user={user}
        totalCount={count}
        loading={loading}
        error={error}
        onRetry={reload}
        title="Resultados"
        emptyTitle={
          hasActiveFilters
            ? 'Nenhum chamado corresponde aos filtros'
            : 'Nenhum chamado encontrado'
        }
        emptyDescription={
          hasActiveFilters
            ? 'Ajuste ou limpe os filtros para ampliar a busca.'
            : isTechnician
              ? 'Novos chamados aparecerão aqui assim que forem abertos.'
              : 'Abra um novo chamado para solicitar atendimento.'
        }
        emptyAction={
          hasActiveFilters ? (
            <Button size="sm" variant="secondary" onClick={clearFilters}>
              Limpar filtros
            </Button>
          ) : (
            <Button as={Link} to="/chamados/novo" size="sm">
              <PlusCircle size={14} aria-hidden="true" />
              Abrir chamado
            </Button>
          )
        }
      />

      {!loading && !error && tickets.length > 0 ? (
        <nav className="pagination" aria-label="Paginação de chamados">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={!hasPrevious || loading}
          >
            Anterior
          </Button>

          <span className="pagination__info">
            Página {page} de {pageCount} · {count}{' '}
            {count === 1 ? 'chamado' : 'chamados'}
          </span>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPage((current) => current + 1)}
            disabled={!hasNext || loading}
          >
            Próxima
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
