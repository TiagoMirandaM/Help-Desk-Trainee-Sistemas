import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  FileQuestion,
  MessageCircleQuestion,
  ShieldAlert,
  Tag,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { useTicketDetail } from '../hooks/useTicketDetail.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { TicketStatusBadge } from '../components/tickets/TicketStatusBadge.jsx';
import { TicketUrgencyBadge } from '../components/tickets/TicketUrgencyBadge.jsx';
import { TicketActions } from '../components/tickets/TicketActions.jsx';
import { TicketComments } from '../components/tickets/TicketComments.jsx';
import { TicketTimeline } from '../components/tickets/TicketTimeline.jsx';
import { ROLES, TICKET_STATUS } from '../utils/constants.js';
import { formatDate, formatDateTime } from '../utils/formatDate.js';
import {
  formatCategory,
  formatTicketCode,
  getUserName,
} from '../utils/formatters.js';
import { getActionErrorMessage } from '../utils/errorMessages.js';
import './pages.css';

function BackLink() {
  return (
    <Link to="/chamados" className="back-link">
      <ArrowLeft size={16} aria-hidden="true" />
      Voltar para chamados
    </Link>
  );
}

export function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const isTechnician = user?.role === ROLES.TECHNICIAN;

  const {
    ticket,
    comments,
    history,
    loading,
    error,
    pendingAction,
    commentSubmitting,
    reload,
    assign,
    transition,
    resolve,
    confirmResolution,
    addComment,
  } = useTicketDetail(id, { includeInternal: isTechnician });

  function notifyActionError(actionError, actionLabel) {
    toast.error(`Não foi possível ${actionLabel}`, getActionErrorMessage(actionError));
    if ([403, 404, 409].includes(actionError?.status)) {
      reload();
    }
  }

  async function handleAssign(urgency) {
    try {
      const updated = await assign(urgency);
      toast.success(
        'Chamado assumido',
        `${formatTicketCode(updated)} agora está em atendimento com você.`,
      );
      return updated;
    } catch (actionError) {
      notifyActionError(actionError, 'assumir o chamado');
      throw actionError;
    }
  }

  async function handleResume() {
    try {
      await transition(TICKET_STATUS.IN_PROGRESS, 'resume');
      toast.success('Atendimento retomado', 'O chamado voltou para em atendimento.');
    } catch (actionError) {
      notifyActionError(actionError, 'retomar o atendimento');
    }
  }

  async function handleResolve(resolution) {
    try {
      const updated = await resolve(resolution);
      toast.success(
        'Confirmação solicitada',
        `${formatTicketCode(updated)} aguarda a resposta do solicitante para ser encerrado.`,
      );
      return updated;
    } catch (actionError) {
      if ([403, 404, 409].includes(actionError?.status)) reload();
      throw actionError;
    }
  }

  async function handleConfirmResolution(resolved) {
    try {
      const updated = await confirmResolution(resolved);
      if (resolved) {
        toast.success(
          'Chamado resolvido',
          `${formatTicketCode(updated)} foi encerrado após a sua confirmação.`,
        );
      } else {
        toast.info(
          'Atendimento retomado',
          `${formatTicketCode(updated)} voltou para a equipe de suporte.`,
        );
      }
      return updated;
    } catch (actionError) {
      if ([403, 404, 409].includes(actionError?.status)) reload();
      throw actionError;
    }
  }

  async function handleComment(content) {
    try {
      await addComment(content);
      toast.success('Comentário registrado', 'O comentário interno foi adicionado ao chamado.');
    } catch (commentError) {
      toast.error(
        'Não foi possível comentar',
        getActionErrorMessage(commentError, 'Tente novamente.'),
      );
      throw commentError;
    }
  }

  if (loading) {
    return (
      <div className="page-stack">
        <BackLink />
        <LoadingState label="Carregando chamado…" />
      </div>
    );
  }

  if (error) {
    const notFound = error.status === 404;
    const forbidden = error.status === 403;

    return (
      <div className="page-stack">
        <BackLink />
        {notFound || forbidden ? (
          <section className="panel">
            <EmptyState
              icon={notFound ? FileQuestion : ShieldAlert}
              title={notFound ? 'Chamado não encontrado' : 'Acesso negado'}
              description={
                notFound
                  ? 'O chamado não existe ou não está disponível para o seu perfil.'
                  : 'Você não possui permissão para visualizar este chamado.'
              }
              action={
                <Button as={Link} to="/chamados" variant="secondary">
                  Voltar para chamados
                </Button>
              }
            />
          </section>
        ) : (
          <ErrorState
            title="Não foi possível carregar o chamado"
            message={getActionErrorMessage(
              error,
              'Verifique sua conexão e tente novamente.',
            )}
            onRetry={reload}
          />
        )}
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="page-stack">
      <BackLink />

      <header className="panel ticket-detail__header">
        <div className="ticket-detail__identity">
          <span className="ticket-detail__code">{formatTicketCode(ticket)}</span>
          <div className="ticket-detail__badges">
            <TicketStatusBadge status={ticket.status} />
            <TicketUrgencyBadge urgency={ticket.urgency} />
          </div>
        </div>

        <h1 className="ticket-detail__title">{ticket.title}</h1>

        <div className="ticket-detail__submeta">
          <span>
            <Tag size={14} aria-hidden="true" />
            {formatCategory(ticket.category)}
          </span>
          <span>
            <CalendarDays size={14} aria-hidden="true" />
            Aberto em {formatDateTime(ticket.createdAt)}
          </span>
          <span>
            <UserRound size={14} aria-hidden="true" />
            {getUserName(ticket.requester)}
          </span>
          {ticket.assignee ? (
            <span>
              <Wrench size={14} aria-hidden="true" />
              {getUserName(ticket.assignee)}
            </span>
          ) : null}
        </div>
      </header>

      <div className="ticket-detail__layout">
        <div className="ticket-detail__main">
          <section className="panel" aria-labelledby="ticket-description-title">
            <div className="panel__header">
              <h2 className="panel__title" id="ticket-description-title">
                Descrição
              </h2>
            </div>
            <div className="panel__body">
              <p className="ticket-description">{ticket.description}</p>
            </div>
          </section>

          {ticket.status === TICKET_STATUS.WAITING_REQUESTER ? (
            <section
              className="panel resolution-panel resolution-panel--proposed"
              aria-labelledby="proposed-resolution-title"
            >
              <div className="panel__header">
                <h2 className="panel__title inline" id="proposed-resolution-title">
                  <MessageCircleQuestion size={17} aria-hidden="true" />
                  Solução proposta
                </h2>
              </div>
              <div className="panel__body">
                <p className="resolution-panel__text">
                  {ticket.resolution ||
                    'O técnico solicitou a confirmação da resolução deste chamado.'}
                </p>
                <p className="resolution-panel__note">
                  {isTechnician
                    ? 'O chamado aguarda a confirmação do solicitante. Se necessário, retome o atendimento para ajustar a solução.'
                    : 'Confirme se o problema foi resolvido ou informe que o atendimento deve continuar.'}
                </p>
              </div>
            </section>
          ) : null}

          {ticket.status === TICKET_STATUS.RESOLVED ? (
            <section className="panel resolution-panel" aria-labelledby="resolution-title">
              <div className="panel__header">
                <h2 className="panel__title inline" id="resolution-title">
                  <CheckCircle2 size={17} aria-hidden="true" />
                  Resolução registrada
                </h2>
                <span className="resolution-panel__date">
                  {formatDateTime(ticket.resolvedAt)}
                </span>
              </div>
              <div className="panel__body">
                <p className="resolution-panel__text">
                  {ticket.resolution ||
                    'A resolução foi registrada pelo backend sem descrição adicional.'}
                </p>
                <p className="resolution-panel__note">
                  Este chamado está encerrado. A reabertura não está disponível no MVP.
                </p>
              </div>
            </section>
          ) : null}

          {isTechnician ? (
            <>
              <TicketComments
                comments={comments}
                submitting={commentSubmitting}
                onSubmit={handleComment}
              />
              <TicketTimeline events={history} />
            </>
          ) : null}
        </div>

        <aside className="ticket-detail__aside">
          <TicketActions
            ticket={ticket}
            user={user}
            pendingAction={pendingAction}
            onAssign={handleAssign}
            onResume={handleResume}
            onResolve={handleResolve}
            onConfirmResolution={handleConfirmResolution}
          />

          <section className="panel detail-info" aria-labelledby="ticket-info-title">
            <div className="panel__header">
              <h2 className="panel__title" id="ticket-info-title">
                Informações operacionais
              </h2>
            </div>
            <dl className="meta-list">
              <div className="meta-list__item">
                <dt>Solicitante</dt>
                <dd>
                  <span className="inline">
                    <Avatar user={ticket.requester} size="sm" />
                    {getUserName(ticket.requester)}
                  </span>
                </dd>
              </div>
              <div className="meta-list__item">
                <dt>Técnico responsável</dt>
                <dd>
                  {ticket.assignee ? (
                    <span className="inline">
                      <Avatar user={ticket.assignee} size="sm" />
                      {getUserName(ticket.assignee)}
                    </span>
                  ) : (
                    <span className="muted">Não atribuído</span>
                  )}
                </dd>
              </div>
              <div className="meta-list__item">
                <dt>
                  <CalendarDays size={13} aria-hidden="true" /> Aberto em
                </dt>
                <dd>{formatDate(ticket.createdAt)}</dd>
              </div>
              <div className="meta-list__item">
                <dt>
                  <CalendarClock size={13} aria-hidden="true" /> Última atualização
                </dt>
                <dd>{formatDateTime(ticket.updatedAt)}</dd>
              </div>
              {ticket.resolvedAt ? (
                <div className="meta-list__item">
                  <dt>
                    <CheckCircle2 size={13} aria-hidden="true" /> Resolvido em
                  </dt>
                  <dd>{formatDateTime(ticket.resolvedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
