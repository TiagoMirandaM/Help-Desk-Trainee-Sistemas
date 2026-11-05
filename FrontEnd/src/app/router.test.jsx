import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './router.jsx';
import { ToastProvider } from '../contexts/ToastContext.jsx';
import { ROLES } from '../utils/constants.js';

const authState = vi.hoisted(() => ({ user: null }));

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: authState.user,
    status: authState.user ? 'authenticated' : 'anonymous',
    isAuthenticated: Boolean(authState.user),
    isLoading: false,
  }),
}));

const technician = { id: 2, name: 'Carlos Lima', role: ROLES.TECHNICIAN };
const requester = { id: 1, name: 'Ana Souza', role: ROLES.REQUESTER };

function renderRoute(path, user) {
  authState.user = user;

  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('rotas por perfil', () => {
  beforeEach(() => {
    authState.user = null;
  });

  it.each(['/painel', '/suporte', '/meus-atendimentos'])(
    'não expõe a rota antiga %s',
    (path) => {
      renderRoute(path, technician);

      expect(
        screen.getByRole('heading', { name: 'Página não encontrada' }),
      ).toBeInTheDocument();
    },
  );

  it('mantém o Kanban restrito a técnicos', () => {
    renderRoute('/kanban', requester);

    expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
  });

  it('não expõe a rota de painel ao solicitante', () => {
    renderRoute('/painel', requester);

    expect(
      screen.getByRole('heading', { name: 'Página não encontrada' }),
    ).toBeInTheDocument();
  });
});
