import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TicketListPage } from './TicketListPage.jsx';
import { ROLES } from '../utils/constants.js';

const authState = vi.hoisted(() => ({ user: null }));
const ticketHookState = vi.hoisted(() => ({ calls: [] }));

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: authState.user }),
}));

vi.mock('../hooks/useCategories.js', () => ({
  useCategories: () => ({ categories: [], loading: false, error: null }),
}));

vi.mock('../hooks/useTickets.js', () => ({
  useTickets: (filters) => {
    ticketHookState.calls.push(filters);

    return {
      tickets: [],
      count: 0,
      loading: false,
      error: null,
      reload: vi.fn(),
      hasNext: false,
      hasPrevious: false,
    };
  },
}));

const technician = { id: 2, name: 'Carlos Lima', role: ROLES.TECHNICIAN };
const requester = { id: 1, name: 'Ana Souza', role: ROLES.REQUESTER };

function renderPage(user) {
  authState.user = user;

  return render(
    <MemoryRouter>
      <TicketListPage />
    </MemoryRouter>,
  );
}

describe('TicketListPage', () => {
  beforeEach(() => {
    authState.user = null;
    ticketHookState.calls = [];
  });

  it('combina o filtro Meus chamados com os demais filtros do técnico', async () => {
    const user = userEvent.setup();
    renderPage(technician);

    expect(
      screen.getByRole('heading', { name: 'Todos os chamados' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Meus chamados' })).not.toBeChecked();
    expect(ticketHookState.calls.at(-1).mine).toBe(false);

    await user.click(screen.getByRole('checkbox', { name: 'Meus chamados' }));

    await waitFor(() => {
      expect(ticketHookState.calls.at(-1).mine).toBe(true);
    });
    expect(screen.getByRole('heading', { name: 'Meus chamados' })).toBeInTheDocument();
  });

  it('mantém o filtro Meus chamados indisponível ao solicitante', () => {
    renderPage(requester);

    expect(screen.getByRole('heading', { name: 'Meus chamados' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Meus chamados' })).not.toBeInTheDocument();
  });
});
