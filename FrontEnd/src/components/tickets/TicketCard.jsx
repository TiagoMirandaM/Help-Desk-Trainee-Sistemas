import { FolderOpen, GripVertical, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';
import { TicketUrgencyBadge } from './TicketUrgencyBadge.jsx';
import { formatDate } from '../../utils/formatDate.js';
import {
  formatCategory,
  formatTicketCode,
  getUserName,
} from '../../utils/formatters.js';
import { TICKET_STATUS } from '../../utils/constants.js';
import { getTicketPermissions } from '../../utils/ticketPermissions.js';
import './tickets.css';

export function TicketCard({
  ticket,
  user,
  onAssign,
  onMove,
  assigning = false,
  dragging = false,
  dragHandleProps = null,
}) {
  const permissions = getTicketPermissions(ticket, user);
  const hasExplicitMove = permissions.canWaitForRequester || permissions.canResume;

  return (
    <article
      className={`ticket-card ${dragging ? 'is-dragging' : ''}`.trim()}
      aria-label={`Chamado ${formatTicketCode(ticket)}`}
      aria-busy={assigning || undefined}
    >
      <div className="ticket-card__top">
        <span className="ticket-card__code">{formatTicketCode(ticket)}</span>
        <TicketUrgencyBadge urgency={ticket.urgency} />
      </div>

      <Link to={`/chamados/${ticket.id}`} className="ticket-card__title">
        {ticket.title}
      </Link>

      <div className="ticket-card__meta">
        <span className="inline">
          <FolderOpen size={13} aria-hidden="true" />
          {formatCategory(ticket.category)}
        </span>
        <span className="ticket-card__date">{formatDate(ticket.createdAt)}</span>
      </div>

      <div className="ticket-card__footer">
        <span className="ticket-card__assignee">
          {ticket.assignee ? (
            <>
              <Avatar user={ticket.assignee} size="sm" />
              <span>{getUserName(ticket.assignee)}</span>
            </>
          ) :null}
        </span>

        <span className="ticket-card__footer-actions">
          {dragHandleProps ? (
            <button
              type="button"
              className="ticket-card__drag-handle"
              {...dragHandleProps}
              aria-label={`Mover chamado ${formatTicketCode(ticket)}`}
              title="Arraste para mover"
            >
              <GripVertical size={15} aria-hidden="true" />
            </button>
          ) : null}

          {permissions.canAssign && onAssign ? (
            <Button
              size="sm"
              variant="subtle"
              onClick={() => onAssign(ticket)}
              loading={assigning}
              aria-label={`Assumir chamado ${formatTicketCode(ticket)}`}
            >
              <UserPlus size={14} aria-hidden="true" />
              Assumir
            </Button>
          ) : (
            <Link
              to={`/chamados/${ticket.id}`}
              className="ticket-card__link"
              aria-label={`Ver detalhes do chamado ${formatTicketCode(ticket)}`}
            >
              Abrir
            </Link>
          )}
        </span>
      </div>

      {hasExplicitMove && onMove ? (
        <div className="ticket-card__actions">
          {permissions.canWaitForRequester ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onMove(ticket, TICKET_STATUS.WAITING_REQUESTER)}
              disabled={assigning}
            >
              Aguardar solicitante
            </Button>
          ) : null}

          {permissions.canResume ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onMove(ticket, TICKET_STATUS.IN_PROGRESS)}
              disabled={assigning}
            >
              Retomar atendimento
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
