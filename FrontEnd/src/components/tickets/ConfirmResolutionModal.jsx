import { useState } from 'react';
import { AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import { formatTicketCode } from '../../utils/formatters.js';
import { getActionErrorMessage } from '../../utils/errorMessages.js';
import './tickets.css';

export function ConfirmResolutionModal({
  open,
  ticket,
  resolved,
  onClose,
  onConfirm,
  pending = false,
}) {
  const [serverError, setServerError] = useState('');

  async function handleConfirm() {
    setServerError('');
    try {
      await onConfirm(resolved);
      onClose();
    } catch (error) {
      setServerError(
        getActionErrorMessage(error, 'Não foi possível registrar sua resposta. Tente novamente.'),
      );
    }
  }

  const positive = resolved === true;
  const Icon = positive ? CheckCircle2 : RotateCcw;

  return (
    <Modal
      open={open}
      onClose={pending ? () => {} : onClose}
      title={positive ? 'Confirmar resolução' : 'Informar que o problema continua'}
      description="Sua resposta será registrada no histórico do chamado."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant={positive ? 'primary' : 'danger'}
            onClick={handleConfirm}
            loading={pending}
            disabled={pending}
          >
            <Icon size={16} aria-hidden="true" />
            {positive ? 'Sim, confirmar resolução' : 'Não, devolver ao atendimento'}
          </Button>
        </>
      }
    >
      {serverError ? (
        <div className="form-alert form-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      ) : null}

      {ticket ? (
        <div className="assign-ticket__summary">
          <span className="assign-ticket__code">{formatTicketCode(ticket)}</span>
          <strong className="assign-ticket__title">{ticket.title}</strong>
        </div>
      ) : null}

      <p className="confirm-resolution__text">
        {positive
          ? 'Você confirma que o problema foi resolvido e deseja encerrar o chamado? Esta ação não poderá ser desfeita no MVP.'
          : 'O chamado voltará para o técnico responsável e o atendimento continuará. Deseja prosseguir?'}
      </p>
    </Modal>
  );
}
