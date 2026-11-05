import { Clock3, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ErrorState } from '../feedback/ErrorState.jsx';
import { LoadingState } from '../feedback/LoadingState.jsx';
import { TicketStatusBadge } from './TicketStatusBadge.jsx';
import { TicketUrgencyBadge } from './TicketUrgencyBadge.jsx';
import { formatDate } from '../../utils/formatDate.js';
import {
  formatCategory,
  formatCount,
  formatTicketCode,
  getUserName,
} from '../../utils/formatters.js';
import { getTicketPermissions } from '../../utils/ticketPermissions.js';
import './tickets.css';

export function TicketTable({
  tickets = [],
  user = null,
  loading = false,
  error = null,
  onRetry,
  totalCount,
  title = 'Chamados',
  emptyTitle = 'Nenhum chamado encontrado',
  emptyDescription = 'Ajuste os filtros ou abra um novo chamado para começar.',
  emptyAction,
  headerAction,
  compact = false,
}) {
  const count = typeof totalCount === 'number' ? totalCount : tickets.length;

  return (
    <section className={`panel ticket-table-panel ${compact ? 'ticket-table-panel--compact' : ''}`.trim()} aria-busy={loading}>
      <div className="panel__header">
        <div>
          <h2 className="panel__title">{title}</h2>
          <p className="panel__subtitle">{formatCount(count, 'chamado', 'chamados')}</p>
        </div>
        {headerAction ? <div>{headerAction}</div> : null}
      </div>

      {loading ? (
        <LoadingState label="Carregando chamados…" />
      ) : error ? (
        <div className="ticket-table-panel__feedback">
          <ErrorState
            title="Não foi possível carregar os chamados"
            message="Verifique sua conexão e tente novamente."
            onRetry={onRetry}
            compact
          />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <div className="table-scroll">
          <table className="ticket-table">
            <caption className="sr-only">Lista de chamados</caption>
            <thead>
              <tr>
                <th scope="col">Chamado</th>
                <th scope="col" className="ticket-table__optional">
                  Categoria
                </th>
                <th scope="col">Urgência</th>
                <th scope="col">Status</th>
                <th scope="col">Abertura</th>
                <th scope="col" className="ticket-table__optional">
                  Responsável
                </th>
                <th scope="col" className="ticket-table__actions-column">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const permissions = getTicketPermissions(ticket, user);
                const pendingConfirmation = permissions.canConfirmResolution;

                return (
                  <tr
                    key={ticket.id}
                    className={pendingConfirmation ? 'ticket-table__row--pending' : undefined}
                  >
                    <td>
                      <div className="ticket-table__ticket">
                        <span className="ticket-table__code">{formatTicketCode(ticket)}</span>
                        <Link
                          to={`/chamados/${ticket.id}`}
                          className="ticket-table__title"
                          aria-label={`Abrir chamado ${formatTicketCode(ticket)}: ${ticket.title}`}
                        >
                          {ticket.title}
                        </Link>
                      </div>
                    </td>
                    <td className="ticket-table__optional">
                      {formatCategory(ticket.category)}
                    </td>
                    <td>
                      <TicketUrgencyBadge urgency={ticket.urgency} />
                    </td>
                    <td>
                      <div className="ticket-table__status">
                        <TicketStatusBadge status={ticket.status} />
                        {pendingConfirmation ? (
                          <span className="ticket-table__pending">
                            <Clock3 size={12} aria-hidden="true" />
                            Aguardando sua confirmação
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="ticket-table__date">{formatDate(ticket.createdAt)}</td>
                    <td className="ticket-table__optional">
                      {ticket.assignee ? (
                        <span className="ticket-table__assignee">
                          <Avatar user={ticket.assignee} size="sm" />
                          <span>{getUserName(ticket.assignee)}</span>
                        </span>
                      ) : (
                        <span className="muted">Não atribuído</span>
                      )}
                    </td>
                    <td className="ticket-table__actions-column">
                      <div className="ticket-table__actions">
                        {pendingConfirmation ? (
                          <Link
                            to={`/chamados/${ticket.id}`}
                            className="btn btn--primary btn--sm"
                            aria-label={`Confirmar resolução do chamado ${formatTicketCode(ticket)}`}
                          >
                            Confirmar
                          </Link>
                        ) : null}
                        <Link
                          to={`/chamados/${ticket.id}`}
                          className="btn btn--secondary btn--sm"
                          aria-label={`Ver detalhes do chamado ${formatTicketCode(ticket)}`}
                        >
                          Detalhes
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
