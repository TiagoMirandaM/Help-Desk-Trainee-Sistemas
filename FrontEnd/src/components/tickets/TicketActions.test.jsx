import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TicketActions } from './TicketActions.jsx';
import { ROLES, TICKET_STATUS } from '../../utils/constants.js';

const requester = { id: 1, name: 'Ana Souza', role: ROLES.REQUESTER };
const otherRequester = { id: 4, name: 'João Pereira', role: ROLES.REQUESTER };
const technician = { id: 2, name: 'Carlos Lima', role: ROLES.TECHNICIAN };

const baseTicket = {
  id: 21,
  code: 'HD-0021',
  title: 'Erro ao acessar o ERP',
  requester,
  assignee: null,
  resolution: 'Serviço reiniciado e validado com o solicitante.',
};

function renderActions(ticket, user, overrides = {}) {
  const handlers = {
    onAssign: vi.fn().mockResolvedValue(undefined),
    onResume: vi.fn(),
    onResolve: vi.fn().mockResolvedValue(undefined),
    onConfirmResolution: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  render(<TicketActions ticket={ticket} user={user} pendingAction={null} {...handlers} />);

  return handlers;
}

describe('TicketActions', () => {
  it('permite ao solicitante proprietário confirmar a resolução pendente', async () => {
    const user = userEvent.setup();
    const handlers = renderActions(
      {
        ...baseTicket,
        status: TICKET_STATUS.WAITING_REQUESTER,
        assignee: technician,
      },
      requester,
    );

    expect(screen.getByText('Confirmação pendente')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /sim, meu problema foi resolvido/i }),
    );
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /sim, confirmar resolução/i }),
    );

    await waitFor(() => {
      expect(handlers.onConfirmResolution).toHaveBeenCalledWith(true);
    });
  });

  it('permite ao solicitante informar que o problema continua', async () => {
    const user = userEvent.setup();
    const handlers = renderActions(
      {
        ...baseTicket,
        status: TICKET_STATUS.WAITING_REQUESTER,
        assignee: technician,
      },
      requester,
    );

    await user.click(screen.getByRole('button', { name: /não, o problema continua/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /não, devolver ao atendimento/i }),
    );

    await waitFor(() => {
      expect(handlers.onConfirmResolution).toHaveBeenCalledWith(false);
    });
  });

  it('não oferece confirmação a outro solicitante', () => {
    renderActions(
      {
        ...baseTicket,
        status: TICKET_STATUS.WAITING_REQUESTER,
        assignee: technician,
      },
      otherRequester,
    );

    expect(screen.getByText('Acompanhamento')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /meu problema foi resolvido/i }),
    ).not.toBeInTheDocument();
  });

  it('assume o chamado com a urgência escolhida no modal', async () => {
    const user = userEvent.setup();
    const handlers = renderActions(
      { ...baseTicket, status: TICKET_STATUS.OPEN },
      technician,
    );

    await user.click(screen.getByRole('button', { name: /assumir chamado/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: 'Alta' }));
    await user.click(
      within(dialog).getByRole('button', { name: /assumir e iniciar atendimento/i }),
    );

    await waitFor(() => {
      expect(handlers.onAssign).toHaveBeenCalledWith('ALTA');
    });
  });

  it('solicita confirmação com a solução descrita pelo técnico', async () => {
    const user = userEvent.setup();
    const handlers = renderActions(
      {
        ...baseTicket,
        status: TICKET_STATUS.IN_PROGRESS,
        assignee: technician,
      },
      technician,
    );

    await user.click(screen.getByRole('button', { name: /solicitar confirmação/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(
      within(dialog).getByLabelText(/solução proposta/i),
      'Ajuste aplicado e validado com o solicitante.',
    );
    await user.click(
      within(dialog).getByRole('button', { name: /solicitar confirmação/i }),
    );

    await waitFor(() => {
      expect(handlers.onResolve).toHaveBeenCalledWith(
        'Ajuste aplicado e validado com o solicitante.',
      );
    });
  });
});
