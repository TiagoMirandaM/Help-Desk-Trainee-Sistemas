import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Header } from './Header.jsx';
import './layout.css';

const SIDEBAR_KEY = 'helpdesk.sidebar.collapsed';

function readCollapsed() {
  try {
    return window.sessionStorage.getItem(SIDEBAR_KEY) === 'true';
  } catch {
    return false;
  }
}

export function AppLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', mobileOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.sessionStorage.setItem(SIDEBAR_KEY, String(next));
      } catch {
        // Preferência apenas visual; ignorar falha de storage.
      }
      return next;
    });
  }

  return (
    <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`.trim()}>
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={toggleCollapsed}
      />

      {mobileOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu de navegação"
        />
      ) : null}

      <div className="app-shell__main">
        <Header onOpenMenu={() => setMobileOpen(true)} />
        <main id="main-content" className="page-container" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
