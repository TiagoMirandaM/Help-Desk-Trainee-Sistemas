import { useEffect, useState } from 'react';
import { AlertCircle, UserPlus } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import { UrgencySelector } from './UrgencySelector.jsx';
import { formatTicketCode } from '../../utils/formatters.js';
import { getActionErrorMessage } from '../../utils/errorMessages.js';
import './tickets.css';

export function AssignTicketModal({
  open,
  ticket,
  onClose,
  onConfirm,
  pending = false,
}) {
  const [urgency, setUrgency] = useState('');
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (open) {
      setUrgency(ticket?.urgency || 'MEDIA');
      setServerError('');
    }
  }, [open, ticket]);

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError('');

    if (!urgency) {
      setServerError('Selecione a urgência antes de assumir o chamado.');
      return;
    }

    try {
      await onConfirm(urgency);
      onClose();
    } catch (error) {
      setServerError(
        getActionErrorMessage(error, 'Não foi possível assumir o chamado. Tente novamente.'),
      );
    }
  }

  return (
    <Modal
      open={open}
      onClose={pending ? () => {} : onClose}
      title="Assumir chamado"
      description="Confirme a urgência antes de iniciar o atendimento."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="assign-ticket-form"
            loading={pending}
            disabled={pending}
          >
            <UserPlus size={16} aria-hidden="true" />
            {pending ? 'Assumindo…' : 'Assumir e iniciar atendimento'}
          </Button>
        </>
      }
    >
      <form id="assign-ticket-form" onSubmit={handleSubmit} noValidate>
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

        <UrgencySelector
          value={urgency}
          onChange={setUrgency}
          label="Urgência do atendimento"
          idPrefix="assign-urgency"
          disabled={pending}
        />
      </form>
    </Modal>
  );
}
