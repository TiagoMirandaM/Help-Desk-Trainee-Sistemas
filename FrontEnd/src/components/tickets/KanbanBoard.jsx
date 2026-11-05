import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  STATUS_LABELS,
  STATUS_ORDER,
  TICKET_STATUS,
  URGENCY_WEIGHT,
} from '../../utils/constants.js';
import { getTicketPermissions } from '../../utils/ticketPermissions.js';
import {
  formatCategory,
  formatTicketCode,
  getUserName,
} from '../../utils/formatters.js';
import { TicketCard } from './TicketCard.jsx';
import { TicketUrgencyBadge } from './TicketUrgencyBadge.jsx';
import './tickets.css';

const STATUS_CLASS = {
  ABERTO: 'is-open',
  EM_ATENDIMENTO: 'is-progress',
  AGUARDANDO_SOLICITANTE: 'is-waiting',
  RESOLVIDO: 'is-resolved',
};

/**
 * Prioriza a coluna sob o ponteiro. O `closestCorners` puro pode escolher uma
 * coluna vizinha quando o cartão arrastado é largo, mesmo com o ponteiro sobre
 * outra coluna. O fallback mantém o arraste por teclado funcional.
 */
function kanbanCollisionDetection(args) {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCorners(args);
}

function sortTickets(tickets) {
  return [...tickets].sort((a, b) => {
    const urgencyDiff = (URGENCY_WEIGHT[b.urgency] || 0) - (URGENCY_WEIGHT[a.urgency] || 0);
    if (urgencyDiff !== 0) return urgencyDiff;
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });
}

/**
 * Deriva os destinos permitidos para o cartão. A validação definitiva continua
 * no backend; aqui apenas evitamos arrastar para transições inválidas.
 */
export function getValidDropTargets(ticket, user) {
  if (!ticket) return [];
  const permissions = getTicketPermissions(ticket, user);

  if (permissions.canAssign) return [TICKET_STATUS.IN_PROGRESS];
  if (permissions.canWaitForRequester) return [TICKET_STATUS.WAITING_REQUESTER];
  if (permissions.canResume) return [TICKET_STATUS.IN_PROGRESS];
  return [];
}

/**
 * Decide o efeito de um drop sem tocar no servidor. Isso mantém a validação
 * do Kanban testável e impede que o overlay dispare ações duplicadas.
 */
export function resolveDropAction(ticket, targetStatus, user) {
  if (!ticket || !targetStatus || targetStatus === ticket.status) {
    return { type: 'none' };
  }

  if (!getValidDropTargets(ticket, user).includes(targetStatus)) {
    return { type: 'invalid' };
  }

  if (ticket.status === TICKET_STATUS.OPEN) {
    return { type: 'assign' };
  }

  return { type: 'move', status: targetStatus };
}

function DraggableTicket({
  ticket,
  user,
  onAssign,
  onMove,
  busy,
  moving,
}) {
  const validTargets = getValidDropTargets(ticket, user);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `kanban-ticket-${ticket.id}`,
    data: { ticket },
    disabled: busy || validTargets.length === 0,
  });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-draggable ${isDragging ? 'is-dragging' : ''}`.trim()}
    >
      <TicketCard
        ticket={ticket}
        user={user}
        onAssign={onAssign}
        onMove={onMove}
        assigning={moving}
        dragging={isDragging}
        dragHandleProps={
          validTargets.length > 0 && !busy ? { ...attributes, ...listeners } : null
        }
      />
    </div>
  );
}

function DroppableColumn({
  status,
  tickets,
  user,
  onAssign,
  onMove,
  activeTicket,
  validTargets,
  busyTicketId,
  movingTicketId,
}) {
  const headingId = `kanban-column-${status.toLowerCase()}`;
  const isDragging = Boolean(activeTicket);
  const isOrigin = activeTicket?.status === status;
  const isValidTarget = validTargets.includes(status);
  const { setNodeRef, isOver } = useDroppable({
    id: `kanban-column-${status}`,
    data: { status },
  });

  const dropState = isDragging
    ? isOrigin
      ? 'is-drop-origin'
      : isValidTarget
        ? 'is-drop-target'
        : 'is-drop-disabled'
    : '';
  const overState = isOver
    ? isValidTarget
      ? 'is-over'
      : isOrigin
        ? ''
        : 'is-over-invalid'
    : '';

  return (
    <section
      ref={setNodeRef}
      className={`kanban-column ${STATUS_CLASS[status] || ''} ${dropState} ${overState}`.trim()}
      data-status={status}
      aria-labelledby={headingId}
    >
      <header className="kanban-column__header">
        <span className="kanban-column__dot" aria-hidden="true" />
        <h2 className="kanban-column__title" id={headingId}>
          {STATUS_LABELS[status]}
        </h2>
        <span className="kanban-column__count" aria-label={`${tickets.length} chamados`}>
          {tickets.length}
        </span>
      </header>

      <div className="kanban-column__body">
        {tickets.length === 0 ? (
          <p className="kanban-column__empty">
            {isDragging && isValidTarget
              ? 'Solte o cartão nesta etapa.'
              : 'Nenhum chamado nesta etapa.'}
          </p>
        ) : (
          tickets.map((ticket) => (
            <DraggableTicket
              key={ticket.id}
              ticket={ticket}
              user={user}
              onAssign={onAssign}
              onMove={onMove}
              busy={String(busyTicketId) === String(ticket.id)}
              moving={String(movingTicketId) === String(ticket.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function DragPreview({ ticket }) {
  return (
    <article className="ticket-card ticket-card--overlay">
      <div className="ticket-card__top">
        <span className="ticket-card__code">{formatTicketCode(ticket)}</span>
        <TicketUrgencyBadge urgency={ticket.urgency} />
      </div>

      <span className="ticket-card__title">{ticket.title}</span>

      <div className="ticket-card__meta">
        <span className="inline">{formatCategory(ticket.category)}</span>
        <span className="ticket-card__date">
          {ticket.assignee ? getUserName(ticket.assignee) : 'Sem responsável'}
        </span>
      </div>
    </article>
  );
}

export function KanbanBoard({
  tickets = [],
  user,
  onAssign,
  onMove,
  onInvalidMove,
  busyTicketId = null,
  movingTicketId = null,
  statusFilter = '',
}) {
  const [activeTicket, setActiveTicket] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  const groups = useMemo(() => {
    const map = new Map(STATUS_ORDER.map((status) => [status, []]));
    tickets.forEach((ticket) => {
      if (!map.has(ticket.status)) map.set(ticket.status, []);
      map.get(ticket.status).push(ticket);
    });
    STATUS_ORDER.forEach((status) => {
      map.set(status, sortTickets(map.get(status) || []));
    });
    return map;
  }, [tickets]);

  const visibleStatuses = useMemo(
  () =>
    statusFilter && STATUS_ORDER.includes(statusFilter)
      ? [statusFilter]
      : STATUS_ORDER,
  [statusFilter],
);

  const validTargets = useMemo(
    () => (activeTicket ? getValidDropTargets(activeTicket, user) : []),
    [activeTicket, user],
  );

  function handleDragStart(event) {
    const ticket = event.active.data.current?.ticket;
    if (!ticket) return;
    setActiveTicket(ticket);
  }

  function handleDragCancel() {
    setActiveTicket(null);
  }

  function handleDragEnd(event) {
    const ticket = event.active.data.current?.ticket;
    const target = event.over?.data.current?.status;
    setActiveTicket(null);

    if (!ticket) return;

    const action = resolveDropAction(ticket, target, user);

    if (action.type === 'none') return;
    if (action.type === 'invalid') {
      onInvalidMove?.(ticket, target);
      return;
    }
    if (action.type === 'assign') {
      onAssign?.(ticket);
      return;
    }

    onMove?.(ticket, action.status);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollisionDetection}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`kanban-board ${activeTicket ? 'is-dragging' : ''}`.trim()}
        role="region"
        aria-label="Quadro Kanban de chamados"
      >
        {visibleStatuses.map((status) => (
          <DroppableColumn
            key={status}
            status={status}
            tickets={groups.get(status) || []}
            user={user}
            onAssign={onAssign}
            onMove={onMove}
            activeTicket={activeTicket}
            validTargets={validTargets}
            busyTicketId={busyTicketId}
            movingTicketId={movingTicketId}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activeTicket ? <DragPreview ticket={activeTicket} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
