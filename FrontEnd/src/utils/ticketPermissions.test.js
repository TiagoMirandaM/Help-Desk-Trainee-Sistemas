import { describe, expect, it } from 'vitest';
import { ROLES, TICKET_STATUS } from './constants.js';
import {
  getTicketActions,
  getTicketPermissions,
  isAssignee,
  isTechnician,
} from './ticketPermissions.js';

const requester = { id: 1, name: 'Ana Souza', role: ROLES.REQUESTER };
const technician = { id: 2, name: 'Carlos Lima', role: ROLES.TECHNICIAN };
const otherTechnician = { id: 3, name: 'Marina Alves', role: ROLES.TECHNICIAN };

function ticket(overrides = {}) {
  return {
    id: 101,
    status: TICKET_STATUS.OPEN,
    assignee: null,
    requester,
    ...overrides,
  };
}

describe('ticketPermissions', () => {
  it('não concede ações operacionais ao solicitante', () => {
    const permissions = getTicketPermissions(ticket(), requester);
    expect(permissions.canAssign).toBe(false);
    expect(permissions.canResolve).toBe(false);
    expect(permissions.canViewInternal).toBe(false);
    expect(getTicketActions(ticket(), requester)).toEqual([]);
  });

  it('permite assumir apenas chamado aberto e sem responsável', () => {
    expect(getTicketPermissions(ticket(), technician).canAssign).toBe(true);
    expect(
      getTicketPermissions(
        ticket({ assignee: otherTechnician }),
        technician,
      ).canAssign,
    ).toBe(false);
  });

  it('permite ao responsável pausar e resolver um chamado em atendimento', () => {
    const current = ticket({
      status: TICKET_STATUS.IN_PROGRESS,
      assignee: technician,
    });
    const permissions = getTicketPermissions(current, technician);

    expect(permissions.canWaitForRequester).toBe(true);
    expect(permissions.canResolve).toBe(true);
    expect(permissions.canResume).toBe(false);
    expect(getTicketActions(current, technician).map((action) => action.id)).toEqual([
      'wait',
      'resolve',
    ]);
  });

  it('não permite que outro técnico opere chamado em atendimento', () => {
    const current = ticket({
      status: TICKET_STATUS.IN_PROGRESS,
      assignee: technician,
    });
    const permissions = getTicketPermissions(current, otherTechnician);

    expect(permissions.canWaitForRequester).toBe(false);
    expect(permissions.canResolve).toBe(false);
    expect(isAssignee(current, technician)).toBe(true);
    expect(isAssignee(current, otherTechnician)).toBe(false);
  });

  it('permite retomar apenas chamados aguardando solicitante sob responsabilidade', () => {
    const current = ticket({
      status: TICKET_STATUS.WAITING_REQUESTER,
      assignee: technician,
    });
    const permissions = getTicketPermissions(current, technician);

    expect(permissions.canResume).toBe(true);
    expect(permissions.canResolve).toBe(false);
    expect(getTicketActions(current, technician)[0].id).toBe('resume');
  });

  it('trata resolvido como estado terminal no MVP', () => {
    const current = ticket({
      status: TICKET_STATUS.RESOLVED,
      assignee: technician,
    });
    const permissions = getTicketPermissions(current, technician);

    expect(permissions.canReopen).toBe(false);
    expect(getTicketActions(current, technician)).toEqual([]);
  });

  it('permite ao solicitante proprietário confirmar apenas em aguardando solicitante', () => {
    const waiting = ticket({
      status: TICKET_STATUS.WAITING_REQUESTER,
      assignee: technician,
    });

    const ownerPermissions = getTicketPermissions(waiting, requester);
    expect(ownerPermissions.canConfirmResolution).toBe(true);
    expect(getTicketActions(waiting, requester).map((action) => action.id)).toEqual([
      'confirm-resolved',
      'confirm-continues',
    ]);

    expect(
      getTicketPermissions(
        ticket({
          status: TICKET_STATUS.WAITING_REQUESTER,
          assignee: technician,
          requester: { id: 4, name: 'João Pereira' },
        }),
        requester,
      ).canConfirmResolution,
    ).toBe(false);

    expect(
      getTicketPermissions(
        ticket({ status: TICKET_STATUS.IN_PROGRESS, assignee: technician }),
        requester,
      ).canConfirmResolution,
    ).toBe(false);

    expect(
      getTicketPermissions(waiting, technician).canConfirmResolution,
    ).toBe(false);
  });

  it('identifica técnicos', () => {
    expect(isTechnician(technician)).toBe(true);
    expect(isTechnician(requester)).toBe(false);
  });
});
