import { ROLES, TICKET_STATUS } from './constants.js';

export function isTechnician(user) {
  return user?.role === ROLES.TECHNICIAN;
}

export function isRequester(user) {
  return user?.role === ROLES.REQUESTER;
}

export function isAssignee(ticket, user) {
  if (!ticket?.assignee || !user) return false;
  return String(ticket.assignee.id) === String(user.id);
}

export function isRequesterOwner(ticket, user) {
  if (!ticket?.requester || !user) return false;
  return String(ticket.requester.id) === String(user.id);
}

/**
 * Deriva as ações permitidas na interface para o estado atual do chamado.
 * A autorização definitiva continua sendo responsabilidade do backend.
 */
export function getTicketPermissions(ticket, user) {
  const technician = isTechnician(user);
  const requester = isRequester(user);
  const owner = isAssignee(ticket, user);

  return {
    canViewInternal: technician,
    canAssign:
      technician &&
      ticket?.status === TICKET_STATUS.OPEN &&
      !ticket?.assignee,
    canWaitForRequester:
      technician &&
      owner &&
      ticket?.status === TICKET_STATUS.IN_PROGRESS,
    canResume:
      technician &&
      owner &&
      ticket?.status === TICKET_STATUS.WAITING_REQUESTER,
    canResolve:
      technician &&
      owner &&
      ticket?.status === TICKET_STATUS.IN_PROGRESS,
    canConfirmResolution:
      requester &&
      isRequesterOwner(ticket, user) &&
      ticket?.status === TICKET_STATUS.WAITING_REQUESTER,
    canReopen: false,
  };
}

export function getTicketActions(ticket, user) {
  const permissions = getTicketPermissions(ticket, user);
  const actions = [];

  if (permissions.canAssign) {
    actions.push({ id: 'assign', label: 'Assumir chamado', tone: 'primary' });
  }
  if (permissions.canWaitForRequester) {
    actions.push({
      id: 'wait',
      label: 'Aguardando solicitante',
      tone: 'secondary',
    });
  }
  if (permissions.canResume) {
    actions.push({ id: 'resume', label: 'Retomar atendimento', tone: 'primary' });
  }
  if (permissions.canResolve) {
    actions.push({ id: 'resolve', label: 'Solicitar confirmação', tone: 'primary' });
  }
  if (permissions.canConfirmResolution) {
    actions.push(
      { id: 'confirm-resolved', label: 'Sim, meu problema foi resolvido.', tone: 'primary' },
      { id: 'confirm-continues', label: 'Não, o problema continua.', tone: 'secondary' },
    );
  }

  return actions;
}
