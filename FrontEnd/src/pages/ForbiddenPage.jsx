import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import './pages.css';

export function ForbiddenPage() {
  return (
    <div className="page-stack">
      <section className="panel error-page">
        <EmptyState
          icon={ShieldAlert}
          title="Acesso negado"
          description="Seu perfil não possui permissão para acessar esta página. Se você acredita que isso é um engano, procure o administrador do sistema."
          action={
            <div className="error-page__actions">
              <Button as={Link} to="/chamados">
                Ir para chamados
              </Button>
            </div>
          }
        />
      </section>
    </div>
  );
}
