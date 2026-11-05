import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { TicketListPage } from '../pages/TicketListPage.jsx';
import { TicketCreatePage } from '../pages/TicketCreatePage.jsx';
import { TicketDetailPage } from '../pages/TicketDetailPage.jsx';
import { KanbanPage } from '../pages/KanbanPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { ForbiddenPage } from '../pages/ForbiddenPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { ROLES } from '../utils/constants.js';

function FullPageLoading() {
  return (
    <div className="app-loading">
      <LoadingState label="Preparando sua sessão…" />
    </div>
  );
}

function RequireAuth() {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoading />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}

function RequireRole({ roles }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}

function RoleHomeRedirect() {
  return <Navigate to="/chamados" replace />;
}

function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <FullPageLoading />;

  if (isAuthenticated) {
    return <Navigate to="/chamados" replace />;
  }

  return <LoginPage />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<RoleHomeRedirect />} />

          <Route element={<RequireRole roles={[ROLES.TECHNICIAN]} />}>
            <Route path="kanban" element={<KanbanPage />} />
          </Route>

          <Route path="chamados" element={<TicketListPage />} />
          <Route path="chamados/novo" element={<TicketCreatePage />} />
          <Route path="chamados/:id" element={<TicketDetailPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
