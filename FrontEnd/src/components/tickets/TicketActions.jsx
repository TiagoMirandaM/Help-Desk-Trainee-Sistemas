import { useState } from 'react';
import {
  CheckCircle2,
  CircleHelp,
  Info,
  MessageCircleQuestion,
  Play,
  RotateCcw,
  UserPlus,
} from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { AssignTicketModal } from './AssignTicketModal.jsx';
import { ConfirmResolutionModal } from './ConfirmResolutionModal.jsx';
import { ResolveTicketModal } from './ResolveTicketModal.jsx';
import { TICKET_STATUS } from '../../utils/constants.js';
import { getTicketPermissions } from '../../utils/ticketPermissions.js';
import './tickets.css';

function getContextHint(ticket, permissions) {
  if (ticket.status === TICKET_STATUS.RESOLVED) {
    return 'Este chamado foi resolvido. A reabertura não está disponível no MVP.';
  }
  if (ticket.status === TICKET_STATUS.OPEN) {
    return permissions.canAssign
      ? 'Este chamado ainda não possui responsável. Ao assumir, defina a urgência e inicie o atendimento.'
      : 'Aguardando que um técnico assuma o atendimento.';
  }
  if (ticket.status === TICKET_STATUS.IN_PROGRESS) {
    return permissions.canResolve
      ? 'O chamado está sob sua responsabilidade. Descreva a solução e solicite a confirmação do solicitante.'
      : 'O atendimento está em andamento com outro técnico.';
  }
  if (ticket.status === TICKET_STATUS.WAITING_REQUESTER) {
    return permissions.canResume
      ? 'O chamado aguarda a confirmação do solicitante. Se necessário, retome o atendimento para ajustar a solução.'
      : 'O atendimento está pausado aguardando o solicitante.';
  }
  return 'Nenhuma ação disponível para o estado atual do chamado.';
}

export function TicketActions({
  ticket,
  user,
  pendingAction,
  onAssign,
  onResume,
  onResolve,
  onConfirmResolution,
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const permissions = getTicketPermissions(ticket, user);
  const isTechnician = Boolean(permissions.canViewInternal);
  const busy = Boolean(pendingAction);

  if (!isTechnician) {
    if (permissions.canConfirmResolution) {
      return (
        <section className="panel action-panel action-panel--confirmation" aria-labelledby="actions-title">
          <div className="panel__header">
            <h2 className="panel__title inline" id="actions-title">
              <MessageCircleQuestion size={17} aria-hidden="true" />
              Confirmação pendente
            </h2>
          </div>
          <div className="action-panel__body">
            <p className="action-panel__hint action-panel__hint--pending">
              <CircleHelp size={16} aria-hidden="true" />
              O técnico propôs uma solução para este chamado. Confirme se o problema foi
              resolvido ou informe que o atendimento deve continuar.
            </p>

            <div className="action-panel__buttons">
              <Button
                onClick={() => setConfirmation(true)}
                loading={pendingAction === 'confirm'}
                disabled={busy && pendingAction !== 'confirm'}
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                Sim, meu problema foi resolvido.
              </Button>
              <Button
                variant="danger"
                onClick={() => setConfirmation(false)}
                disabled={busy}
              >
                <RotateCcw size={16} aria-hidden="true" />
                Não, o problema continua.
              </Button>
            </div>

            {pendingAction === 'confirm' ? (
              <p className="action-panel__status" role="status">
                Registrando sua resposta…
              </p>
            ) : null}
          </div>

          <ConfirmResolutionModal
            open={confirmation !== null}
            ticket={ticket}
            resolved={confirmation}
            onClose={() => setConfirmation(null)}
            onConfirm={onConfirmResolution}
            pending={pendingAction === 'confirm'}
          />
        </section>
      );
    }

    return (
      <section className="panel action-panel" aria-labelledby="actions-title">
        <div className="panel__header">
          <h2 className="panel__title" id="actions-title">
            Acompanhamento
          </h2>
        </div>
        <div className="action-panel__body">
          <p className="action-panel__hint">
            <Info size={16} aria-hidden="true" />
            Como solicitante, você acompanha o andamento e o responsável pelo
            atendimento. A alteração de status é realizada exclusivamente pela
            equipe de suporte.
          </p>
        </div>
      </section>
    );
  }

  const hasActions = permissions.canAssign || permissions.canResume || permissions.canResolve;

  return (
    <section className="panel action-panel" aria-labelledby="actions-title">
      <div className="panel__header">
        <h2 className="panel__title" id="actions-title">
          Ações do chamado
        </h2>
      </div>

      <div className="action-panel__body">
        <p className="action-panel__hint">
          <CircleHelp size={16} aria-hidden="true" />
          {getContextHint(ticket, permissions)}
        </p>

        {hasActions ? (
          <div className="action-panel__buttons">
            {permissions.canAssign ? (
              <Button
                onClick={() => setAssignOpen(true)}
                loading={pendingAction === 'assign'}
                disabled={busy && pendingAction !== 'assign'}
              >
                <UserPlus size={16} aria-hidden="true" />
                Assumir chamado
              </Button>
            ) : null}

            {permissions.canResume ? (
              <Button
                onClick={onResume}
                loading={pendingAction === 'resume'}
                disabled={busy && pendingAction !== 'resume'}
              >
                <Play size={16} aria-hidden="true" />
                Retomar atendimento
              </Button>
            ) : null}

            {permissions.canResolve ? (
              <Button
                variant="primary"
                onClick={() => setResolveOpen(true)}
                disabled={busy}
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                Solicitar confirmação
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="action-panel__empty">
            Nenhuma ação operacional está disponível para este chamado no
            estado atual.
          </p>
        )}

        {pendingAction && pendingAction !== 'resolve' ? (
          <p className="action-panel__status" role="status">
            Enviando ação ao servidor…
          </p>
        ) : null}
      </div>

      <AssignTicketModal
        open={assignOpen}
        ticket={ticket}
        onClose={() => setAssignOpen(false)}
        onConfirm={onAssign}
        pending={pendingAction === 'assign'}
      />

      <ResolveTicketModal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onConfirm={onResolve}
        pending={pendingAction === 'resolve'}
      />
    </section>
  );
}
