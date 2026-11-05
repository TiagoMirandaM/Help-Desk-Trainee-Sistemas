import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar.jsx';
import { ROLES } from '../../utils/constants.js';

const authState = vi.hoisted(() => ({ user: null }));

vi.mock('../../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: authState.user }),
}));

const technician = {
  id: 2,
  name: 'Carlos Lima',
  role: ROLES.TECHNICIAN,
};

const requester = {
  id: 1,
  name: 'Ana Souza',
  role: ROLES.REQUESTER,
};

function renderSidebar(user) {
  authState.user = user;

  return render(
    <MemoryRouter>
      <Sidebar
        collapsed={false}
        mobileOpen={false}
        onCloseMobile={vi.fn()}
        onToggleCollapse={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    authState.user = null;
  });

  it('exibe apenas a navegação final do técnico', () => {
    renderSidebar(technician);

    expect(screen.getByRole('link', { name: 'Todos os chamados' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kanban' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir chamado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Meu perfil' })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: 'Painel de suporte' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Meus atendimentos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Meu painel' })).not.toBeInTheDocument();
  });

  it('exibe apenas a navegação final do solicitante', () => {
    renderSidebar(requester);

    expect(screen.getByRole('link', { name: 'Meus chamados' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir chamado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Meu perfil' })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: 'Todos os chamados' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Kanban' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Meu painel' })).not.toBeInTheDocument();
  });
});
