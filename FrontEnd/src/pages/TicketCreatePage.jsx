import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, PlusCircle } from 'lucide-react';
import { useCategories } from '../hooks/useCategories.js';
import { useToast } from '../contexts/ToastContext.jsx';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { TicketForm } from '../components/tickets/TicketForm.jsx';
import { TicketStatusBadge } from '../components/tickets/TicketStatusBadge.jsx';
import { TicketUrgencyBadge } from '../components/tickets/TicketUrgencyBadge.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { createTicket } from '../services/ticketService.js';
import { formatCategory, formatTicketCode } from '../utils/formatters.js';
import { formatDateTime } from '../utils/formatDate.js';
import { getActionErrorMessage } from '../utils/errorMessages.js';
import './pages.css';

export function TicketCreatePage() {
  const { categories, loading, error, reload } = useCategories();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdTicket, setCreatedTicket] = useState(null);
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(values) {
    setSubmitting(true);
    setSubmitError('');

    try {
      const ticket = await createTicket({
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category,
      });

      setCreatedTicket(ticket);
      toast.success(
        'Chamado aberto com sucesso',
        `${formatTicketCode(ticket)} foi registrado e encaminhado para o suporte.`,
      );
    } catch (requestError) {
      setSubmitError(
        getActionErrorMessage(requestError, 'Não foi possível abrir o chamado. Tente novamente.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startAnother() {
    setCreatedTicket(null);
    setSubmitError('');
    setFormKey((value) => value + 1);
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Novo chamado"
        title={createdTicket ? 'Chamado registrado' : 'Abrir chamado'}
        description={
          createdTicket
            ? 'Confira os dados do chamado criado e acompanhe o atendimento.'
            : 'Descreva o problema com detalhes para agilizar o atendimento.'
        }
        actions={
          <Button as={Link} to="/chamados" variant="secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar para chamados
          </Button>
        }
      />

      {createdTicket ? (
        <section className="panel create-success" aria-labelledby="create-success-title">
          <span className="create-success__icon" aria-hidden="true">
            <CheckCircle2 size={28} />
          </span>
          <h2 className="create-success__title" id="create-success-title">
            Chamado aberto com sucesso
          </h2>
          <p className="create-success__description">
            Seu chamado foi registrado e já está disponível para a equipe de
            suporte. Você pode acompanhar o andamento na área de detalhes.
          </p>

          <div className="create-success__ticket">
            <div className="create-success__ticket-head">
              <span className="create-success__code">
                {formatTicketCode(createdTicket)}
              </span>
              <div className="inline">
                <TicketStatusBadge status={createdTicket.status} />
                <TicketUrgencyBadge urgency={createdTicket.urgency} />
              </div>
            </div>
            <strong className="create-success__ticket-title">
              {createdTicket.title}
            </strong>
            <span className="create-success__ticket-meta">
              {formatCategory(createdTicket.category)} · aberto em{' '}
              {formatDateTime(createdTicket.createdAt)}
            </span>
          </div>

          <div className="create-success__actions">
            <Button as={Link} to={`/chamados/${createdTicket.id}`}>
              Ver detalhes do chamado
            </Button>
            <Button variant="secondary" onClick={startAnother}>
              <PlusCircle size={16} aria-hidden="true" />
              Abrir outro chamado
            </Button>
            <Link to="/chamados" className="panel__link">
              Voltar para chamados
            </Link>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="panel__body">
            {loading ? (
              <LoadingState label="Carregando categorias…" />
            ) : error ? (
              <ErrorState
                title="Não foi possível carregar as categorias"
                message="As categorias são necessárias para abrir um chamado. Tente novamente."
                onRetry={reload}
              />
            ) : categories.length === 0 ? (
              <ErrorState
                title="Nenhuma categoria disponível"
                message="O backend não retornou categorias. Verifique a configuração do serviço."
                onRetry={reload}
              />
            ) : (
              <TicketForm
                key={formKey}
                categories={categories}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitError={submitError}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
