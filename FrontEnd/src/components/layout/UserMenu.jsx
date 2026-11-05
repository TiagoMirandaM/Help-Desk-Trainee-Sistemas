import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { formatRole, getUserName } from '../../utils/formatters.js';
import './layout.css';

export function UserMenu() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    setOpen(false);
    await logout();
    toast.info('Sessão encerrada', 'Até logo!');
    navigate('/login', { replace: true });
  }

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar user={user} size="sm" />
        <span className="user-menu__identity">
          <span className="user-menu__name">{getUserName(user)}</span>
          <span className="user-menu__role">{formatRole(user?.role)}</span>
        </span>
        <ChevronDown
          size={15}
          className={`user-menu__chevron ${open ? 'user-menu__chevron--open' : ''}`.trim()}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="user-menu__panel" role="menu" aria-label="Menu do usuário">
          <div className="user-menu__header">
            <Avatar user={user} size="md" />
            <div className="user-menu__header-text">
              <strong>{getUserName(user)}</strong>
              <span>{user?.email || user?.username}</span>
            </div>
          </div>

          <div className="user-menu__divider" />

          <Link
            to="/perfil"
            className="user-menu__item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <UserRound size={16} aria-hidden="true" />
            Meu perfil
          </Link>

          <button
            type="button"
            className="user-menu__item user-menu__item--danger"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={16} aria-hidden="true" />
            {loggingOut ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
