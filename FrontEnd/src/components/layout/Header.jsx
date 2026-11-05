import { Menu, FlaskConical } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { DEMO_MODE } from '../../utils/env.js';
import { UserMenu } from './UserMenu.jsx';
import './layout.css';

function getPageTitle(pathname) {
  if (pathname === '/kanban') return 'Kanban';
  if (pathname === '/chamados') return 'Chamados';
  if (pathname === '/chamados/novo') return 'Abrir chamado';
  if (pathname.startsWith('/chamados/')) return 'Detalhes do chamado';
  if (pathname === '/perfil') return 'Meu perfil';
  if (pathname === '/403') return 'Acesso negado';
  return 'Página não encontrada';
}

export function Header({ onOpenMenu }) {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <header className="app-header">
      <div className="app-header__left">
        <button
          type="button"
          className="icon-btn app-header__menu"
          onClick={onOpenMenu}
          aria-label="Abrir menu de navegação"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <nav className="app-header__breadcrumb" aria-label="Você está em">
          <span className="app-header__crumb-root">Helpdesk</span>
          <span className="app-header__crumb-separator" aria-hidden="true">
            /
          </span>
          <span className="app-header__crumb-current" aria-current="page">
            {title}
          </span>
        </nav>
      </div>

      <div className="app-header__right">
        {DEMO_MODE ? (
          <span className="demo-badge" title="Dados fictícios de demonstração">
            <FlaskConical size={14} aria-hidden="true" />
            Modo demonstração
          </span>
        ) : null}
        <UserMenu />
      </div>
    </header>
  );
}
