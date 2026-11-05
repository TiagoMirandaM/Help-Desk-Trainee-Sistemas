import {
  ArrowRight,
  ArrowRightLeft,
  BadgeCheck,
  CheckCircle2,
  Gauge,
  History,
  MessageCircleQuestion,
  PlusCircle,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import { EmptyState } from '../ui/EmptyState.jsx';
import { TicketStatusBadge } from './TicketStatusBadge.jsx';
import { formatDateTime } from '../../utils/formatDate.js';
import { formatStatus, getUserName } from '../../utils/formatters.js';
import './tickets.css';

const EVENT_ICONS = {
  CREATED: PlusCircle,
  TICKET_CREATED: PlusCircle,
  ASSIGNED: UserCheck,
  TICKET_ASSIGNED: UserCheck,
  STATUS_CHANGED: ArrowRightLeft,
  TRANSITION: ArrowRightLeft,
  STATUS_UPDATED: ArrowRightLeft,
  URGENCY_CHANGED: Gauge,
  CONFIRMATION_REQUESTED: MessageCircleQuestion,
  REQUESTER_CONFIRMED: CheckCircle2,
  REQUESTER_REJECTED: RotateCcw,
  RETURNED_TO_SERVICE: RotateCcw,
  RESOLVED_BY_REQUESTER: BadgeCheck,
  RESOLVED: CheckCircle2,
  TICKET_RESOLVED: CheckCircle2,
};

const EVENT_LABELS = {
  CREATED: 'Chamado criado',
  TICKET_CREATED: 'Chamado criado',
  ASSIGNED: 'Técnico atribuído',
  TICKET_ASSIGNED: 'Técnico atribuído',
  STATUS_CHANGED: 'Status alterado',
  TRANSITION: 'Status alterado',
  STATUS_UPDATED: 'Status alterado',
  URGENCY_CHANGED: 'Urgência definida',
  CONFIRMATION_REQUESTED: 'Confirmação solicitada',
  REQUESTER_CONFIRMED: 'Solicitante confirmou a resolução',
  REQUESTER_REJECTED: 'Solicitante informou que o problema continua',
  RETURNED_TO_SERVICE: 'Chamado retornou ao atendimento',
  RESOLVED_BY_REQUESTER: 'Chamado resolvido por confirmação',
  RESOLVED: 'Chamado resolvido',
  TICKET_RESOLVED: 'Chamado resolvido',
};

export function TicketTimeline({ events = [] }) {
  return (
    <section className="panel timeline-panel" aria-labelledby="timeline-title">
      <div className="panel__header">
        <div>
          <h2 className="panel__title inline" id="timeline-title">
            <History size={17} aria-hidden="true" />
            Histórico de auditoria
          </h2>
          <p className="panel__subtitle">Eventos registrados pelo backend, em ordem cronológica.</p>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nenhum evento registrado"
          description="As alterações do chamado aparecerão aqui."
          compact
        />
      ) : (
        <ol className="timeline">
          {events.map((event) => {
            const Icon = EVENT_ICONS[event.type] || History;
            const label = event.label || EVENT_LABELS[event.type] || event.type;

            return (
              <li key={event.id} className="timeline__item">
                <span className="timeline__marker" aria-hidden="true">
                  <Icon size={15} />
                </span>
                <div className="timeline__content">
                  <div className="timeline__headline">
                    <strong>{label}</strong>
                    <time dateTime={event.createdAt || undefined}>
                      {formatDateTime(event.createdAt)}
                    </time>
                  </div>
                  <p className="timeline__actor">
                    {getUserName(event.actor)}
                    {event.fromStatus || event.toStatus ? (
                      <span className="timeline__transition">
                        {event.fromStatus ? (
                          <TicketStatusBadge status={event.fromStatus} />
                        ) : (
                          <span className="muted">Novo</span>
                        )}
                        <ArrowRight size={12} aria-hidden="true" />
                        {event.toStatus ? (
                          <TicketStatusBadge status={event.toStatus} />
                        ) : (
                          <span className="muted">{formatStatus(event.toStatus)}</span>
                        )}
                      </span>
                    ) : null}
                  </p>
                  {event.description ? (
                    <p className="timeline__description">{event.description}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
