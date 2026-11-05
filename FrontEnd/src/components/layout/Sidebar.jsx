import {
  Columns3,
  Inbox,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ROLES } from '../../utils/constants.js';
import { LogoIcon } from '../ui/LogoIcon';
import { getInitials, getUserName } from '../../utils/formatters.js';
import './layout.css';

const REQUESTER_NAV = [
  { to: '/chamados', label: 'Meus chamados', icon: Inbox, end: true },
  { to: '/chamados/novo', label: 'Abrir chamado', icon: PlusCircle },
  { to: '/perfil', label: 'Meu perfil', icon: UserRound },
];

const TECHNICIAN_NAV = [
  { to: '/chamados', label: 'Todos os chamados', icon: Inbox, end: true },
  { to: '/kanban', label: 'Kanban', icon: Columns3 },
  { to: '/chamados/novo', label: 'Abrir chamado', icon: PlusCircle },
  { to: '/perfil', label: 'Meu perfil', icon: UserRound },
];

export function Sidebar({ collapsed, mobileOpen, onCloseMobile, onToggleCollapse }) {
  const { user } = useAuth();
  const items = user?.role === ROLES.TECHNICIAN ? TECHNICIAN_NAV : REQUESTER_NAV;
  const home = '/chamados';

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--open' : ''
        }`.trim()}
      aria-label="Navegação principal"
    >
      <div className="sidebar__brand">
        <Link to={home} className="brand" aria-label="Helpdesk - ir para o início">
          <span className="brand__mark" aria-hidden="true">
            <LogoIcon size="80%" style={{ width: '80%', height: '80%' }} />
          </span>
          <span className="brand__text">
            <span className="brand__name">Helpdesk</span>
            <span className="brand__tagline">Central de atendimento</span>
          </span>
        </Link>

        <button
          type="button"
          className="icon-btn sidebar__close"
          onClick={onCloseMobile}
          aria-label="Fechar menu"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>



      <nav className="sidebar__nav">
        <span className="sidebar__section-label">Navegação</span>
        <ul className="sidebar__list">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className="nav-link__icon" aria-hidden="true" />
                  <span className="nav-link__label">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar__footer">

        <button
          type="button"
          className="sidebar__collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )}
          <span className="sidebar__collapse-label">Recolher menu</span>
        </button>
      </div>
    </aside>
  );
}
