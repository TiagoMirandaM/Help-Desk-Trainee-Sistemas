import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import {
  KanbanBoard,
  getValidDropTargets,
  resolveDropAction,
} from './KanbanBoard.jsx';
import { ROLES, TICKET_STATUS } from '../../utils/constants.js';

const technician = { id: 2, name: 'Carlos Lima', role: ROLES.TECHNICIAN };
const otherTechnician = { id: 3, name: 'Marina Alves', role: ROLES.TECHNICIAN };
const requester = { id: 1, name: 'Ana Souza', role: ROLES.REQUESTER };

const baseTicket = {
  category: { id: 1, name: 'TI' },
  createdAt: '2026-10-20T10:00:00Z',
  requester: { id: 1, name: 'Ana Souza' },
  assignee: null,
};

const tickets = [
  {
    ...baseTicket,
    id: 1,
    code: 'HD-0001',
    title: 'Chamado aberto sem responsável',
    status: TICKET_STATUS.OPEN,
    urgency: 'ALTA',
  },
  {
    ...baseTicket,
    id: 2,
    code: 'HD-0002',
    title: 'Chamado em atendimento',
    status: TICKET_STATUS.IN_PROGRESS,
    urgency: 'MEDIA',
    assignee: technician,
  },
  {
    ...baseTicket,
    id: 3,
    code: 'HD-0003',
    title: 'Chamado aguardando solicitante',
    status: TICKET_STATUS.WAITING_REQUESTER,
    urgency: 'BAIXA',
    assignee: technician,
  },
  {
    ...baseTicket,
    id: 4,
    code: 'HD-0004',
    title: 'Chamado resolvido',
    status: TICKET_STATUS.RESOLVED,
    urgency: 'ALTA',
    assignee: technician,
  },
];

function renderBoard({
  user = technician,
  onAssign = vi.fn(),
  onMove = vi.fn(),
  onInvalidMove = vi.fn(),
  busyTicketId = null,
} = {}) {
  return render(
    <MemoryRouter>
      <KanbanBoard
        tickets={tickets}
        user={user}
        onAssign={onAssign}
        onMove={onMove}
        onInvalidMove={onInvalidMove}
        busyTicketId={busyTicketId}
      />
    </MemoryRouter>,
  );
}

describe('KanbanBoard', () => {
  it('renderiza as quatro colunas fixas com contagem e cartões', () => {
    renderBoard();

    const openHeading = screen.getByRole('heading', { name: 'Aberto' });
    const progressHeading = screen.getByRole('heading', { name: 'Em atendimento' });
    const waitingHeading = screen.getByRole('heading', {
      name: 'Aguardando solicitante',
    });
    const resolvedHeading = screen.getByRole('heading', { name: 'Resolvido' });

    expect(openHeading).toBeInTheDocument();
    expect(progressHeading).toBeInTheDocument();
    expect(waitingHeading).toBeInTheDocument();
    expect(resolvedHeading).toBeInTheDocument();

    const columns = [openHeading, progressHeading, waitingHeading, resolvedHeading];

    columns.forEach((heading) => {
      const column = heading.closest('section');
      expect(within(column).getByLabelText('1 chamados')).toBeInTheDocument();
    });

    expect(screen.getByText('Chamado aberto sem responsável')).toBeInTheDocument();
    expect(screen.getByText('Chamado resolvido')).toBeInTheDocument();
  });

  it('oferece assumir apenas para técnico em chamado aberto sem responsável', async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn();
    renderBoard({ onAssign });

    const assignButton = screen.getByRole('button', {
      name: 'Assumir chamado HD-0001',
    });
    expect(assignButton).toBeInTheDocument();

    await user.click(assignButton);
    expect(onAssign).toHaveBeenCalledWith(tickets[0]);
  });

  it('oferece ações explícitas de transição para o técnico responsável', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove });

    await user.click(screen.getByRole('button', { name: 'Aguardar solicitante' }));
    expect(onMove).toHaveBeenCalledWith(tickets[1], TICKET_STATUS.WAITING_REQUESTER);

    await user.click(screen.getByRole('button', { name: 'Retomar atendimento' }));
    expect(onMove).toHaveBeenCalledWith(tickets[2], TICKET_STATUS.IN_PROGRESS);
  });

  it('expõe alça de arraste apenas para chamados que o técnico pode mover', () => {
    renderBoard();

    expect(
      screen.getByRole('button', { name: 'Mover chamado HD-0001' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mover chamado HD-0002' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mover chamado HD-0003' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mover chamado HD-0004' }),
    ).not.toBeInTheDocument();
  });

  it('não oferece ações nem arraste ao solicitante', () => {
    renderBoard({ user: requester });

    expect(
      screen.queryByRole('button', { name: /assumir chamado/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /mover chamado/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('Abrir')).toHaveLength(tickets.length);
  });

  it('não permite mover chamados de outro técnico', () => {
    renderBoard({ user: otherTechnician });

    expect(
      screen.getByRole('button', { name: 'Mover chamado HD-0001' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mover chamado HD-0002' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mover chamado HD-0003' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aguardar solicitante' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retomar atendimento' }),
    ).not.toBeInTheDocument();
  });

  it('bloqueia o arraste do cartão enquanto uma ação está pendente', () => {
    renderBoard({ busyTicketId: 2 });

    expect(
      screen.queryByRole('button', { name: 'Mover chamado HD-0002' }),
    ).not.toBeInTheDocument();
  });

  it('deriva os destinos permitidos a partir das permissões', () => {
    expect(getValidDropTargets(tickets[0], technician)).toEqual([
      TICKET_STATUS.IN_PROGRESS,
    ]);
    expect(getValidDropTargets(tickets[1], technician)).toEqual([
      TICKET_STATUS.WAITING_REQUESTER,
    ]);
    expect(getValidDropTargets(tickets[2], technician)).toEqual([
      TICKET_STATUS.IN_PROGRESS,
    ]);
    expect(getValidDropTargets(tickets[3], technician)).toEqual([]);
    expect(getValidDropTargets(tickets[1], otherTechnician)).toEqual([]);
    expect(getValidDropTargets(tickets[0], requester)).toEqual([]);
  });

  it('valida o destino do drop antes de chamar o backend', () => {
    expect(
      resolveDropAction(tickets[0], TICKET_STATUS.IN_PROGRESS, technician),
    ).toEqual({ type: 'assign' });

    expect(
      resolveDropAction(tickets[1], TICKET_STATUS.WAITING_REQUESTER, technician),
    ).toEqual({ type: 'move', status: TICKET_STATUS.WAITING_REQUESTER });

    expect(
      resolveDropAction(tickets[2], TICKET_STATUS.IN_PROGRESS, technician),
    ).toEqual({ type: 'move', status: TICKET_STATUS.IN_PROGRESS });

    expect(
      resolveDropAction(tickets[1], TICKET_STATUS.RESOLVED, technician),
    ).toEqual({ type: 'invalid' });

    expect(
      resolveDropAction(tickets[1], TICKET_STATUS.WAITING_REQUESTER, otherTechnician),
    ).toEqual({ type: 'invalid' });

    expect(
      resolveDropAction(tickets[1], TICKET_STATUS.IN_PROGRESS, technician),
    ).toEqual({ type: 'none' });
  });
});
