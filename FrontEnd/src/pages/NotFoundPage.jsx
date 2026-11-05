import { Link, useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import './pages.css';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="page-stack">
      <section className="panel error-page">
        <EmptyState
          icon={FileQuestion}
          title="Página não encontrada"
          description="O endereço acessado não existe ou foi movido. Verifique o link e tente novamente."
          action={
            <div className="error-page__actions">
              <Button as={Link} to="/chamados">
                Ir para chamados
              </Button>
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Voltar
              </Button>
            </div>
          }
        />
      </section>
    </div>
  );
}
