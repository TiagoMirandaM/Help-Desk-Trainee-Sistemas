import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Inbox, List, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { useCategories } from '../hooks/useCategories.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useTickets } from '../hooks/useTickets.js';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { TicketFilters } from '../components/tickets/TicketFilters.jsx';
import { KanbanBoard } from '../components/tickets/KanbanBoard.jsx';
import { AssignTicketModal } from '../components/tickets/AssignTicketModal.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { assignTicket, transitionTicket } from '../services/ticketService.js';
import { STATUS_LABELS, TICKET_STATUS } from '../utils/constants.js';
import { formatTicketCode } from '../utils/formatters.js';
import { getActionErrorMessage } from '../utils/errorMessages.js';
import './pages.css';

const DEFAULT_FILTERS = {
  search: '',
  status: '',
  urgency: '',
  category: '',
  assignee: '',
  ordering: 'created_at',
};

function describeInvalidMove(ticket, target) {
  if (!target) {
    return 'Solte o cartão em uma coluna de destino válida.';
  }
  if (target === TICKET_STATUS.RESOLVED) {
    return 'Para encerrar um chamado, use “Solicitar confirmação” e aguarde a resposta do solicitante.';
  }
  if (ticket.status === TICKET_STATUS.OPEN) {
    return 'Assuma o chamado para iniciar o atendimento antes de mover para outra etapa.';
  }
  if (target === TICKET_STATUS.OPEN) {
    return 'Um chamado não pode retornar para a etapa Aberto.';
  }
  return 'Apenas o técnico responsável pode mover este chamado para a etapa escolhida.';
}

export function KanbanPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { categories } = useCategories();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [movingId, setMovingId] = useState(null);
  const [moveError, setMoveError] = useState('');

  const debouncedSearch = useDebouncedValue(filters.search, 350);

  const query = useMemo(
    () => ({
      search: debouncedSearch.trim(),
      status: filters.status,
      urgency: filters.urgency,
      category: filters.category,
      assignee: filters.assignee,
      ordering: 'created_at',
      page_size: 200,
    }),
    [debouncedSearch, filters.urgency, filters.category, filters.status, filters.assignee],
  );

  const { tickets, loading, error, reload } = useTickets(query);

  const assignees = useMemo(() => {
    const map = new Map();

    tickets.forEach((ticket) => {
      if (ticket.assignee) {
        map.set(String(ticket.assignee.id), ticket.assignee);
      }
    });

    if (user && !map.has(String(user.id))) {
      map.set(String(user.id), user);
    }

    return [...map.values()].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR'),
    );
  }, [tickets, user]);

  function handleFilterChange(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setMoveError('');
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setMoveError('');
  }

  async function handleAssignConfirm(urgency) {
    if (!assignTarget) return undefined;

    setAssigningId(assignTarget.id);
    setMoveError('');
    try {
      const updated = await assignTicket(assignTarget.id, urgency);
      toast.success(
        'Chamado assumido',
        `${formatTicketCode(updated)} agora está em atendimento com você.`,
      );
      setAssignTarget(null);
      reload();
      return updated;
    } catch (assignError) {
      toast.error('Não foi possível assumir o chamado', getActionErrorMessage(assignError));
      if ([403, 404, 409].includes(assignError?.status)) reload();
      throw assignError;
    } finally {
      setAssigningId(null);
    }
  }

  async function handleMove(ticket, target) {
    setMovingId(ticket.id);
    setMoveError('');
    try {
      const updated = await transitionTicket(ticket.id, target);
      toast.success(
        'Chamado movido',
        `${formatTicketCode(updated)} agora está em ${STATUS_LABELS[target].toLowerCase()}.`,
      );
      reload();
    } catch (moveFailure) {
      const message = getActionErrorMessage(moveFailure);
      setMoveError(message);
      toast.error('Não foi possível mover o chamado', message);
      if ([403, 404, 409].includes(moveFailure?.status)) reload();
    } finally {
      setMovingId(null);
    }
  }

  function handleInvalidMove(ticket, target) {
    const message = describeInvalidMove(ticket, target);
    setMoveError(message);
    toast.error('Movimento não permitido', message);
  }

  const hasActiveFilters = Boolean(
    filters.search || filters.urgency || filters.category || filters.assignee,
  );

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Suporte"
        title="Kanban"
        description="Visualize o fluxo de atendimento e mova os chamados entre as etapas permitidas."
        actions={
          <Button as={Link} to="/chamados" variant="secondary">
            <List size={16} aria-hidden="true" />
            Ver lista
          </Button>
        }
      />

      <TicketFilters
        filters={filters}
        onChange={handleFilterChange}
        onClear={clearFilters}
        categories={categories}
        assignees={assignees}
        showAssignee
        showOrdering={false}
        idPrefix="kanban-filters"
      />

      <div className="kanban-toolbar">
        <span className="kanban-toolbar__count">
          <Inbox size={14} aria-hidden="true" />
          {tickets.length} {tickets.length === 1 ? 'chamado no quadro' : 'chamados no quadro'}
        </span>

      </div>

      {moveError ? (
        <div className="kanban-feedback" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{moveError}</span>
          <button
            type="button"
            className="kanban-feedback__close"
            onClick={() => setMoveError('')}
            aria-label="Fechar aviso"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {loading ? (
        <LoadingState label="Carregando quadro Kanban…" />
      ) : error ? (
        <ErrorState
          title="Não foi possível carregar o quadro"
          message="Verifique sua conexão e tente novamente."
          onRetry={reload}
        />
      ) : (
        <>
          {tickets.length === 0 ? (
            <div className="kanban-zero" role="status">
              <span>
                {hasActiveFilters
                  ? 'Nenhum chamado corresponde aos filtros selecionados.'
                  : 'Nenhum chamado disponível no momento.'}
              </span>
              {hasActiveFilters ? (
                <Button size="sm" variant="secondary" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : null}
            </div>
          ) : null}

          <KanbanBoard
            tickets={tickets}
            user={user}
            statusFilter={filters.status}
            onAssign={setAssignTarget}
            onMove={handleMove}
            onInvalidMove={handleInvalidMove}
            busyTicketId={assigningId || movingId}
            movingTicketId={movingId}

            
          />
        </>
      )}

      <AssignTicketModal
        open={Boolean(assignTarget)}
        ticket={assignTarget}
        onClose={() => setAssignTarget(null)}
        onConfirm={handleAssignConfirm}
        pending={Boolean(assigningId)}
      />
    </div>
  );
}
