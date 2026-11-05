import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Textarea } from '../ui/Textarea.jsx';
import { TICKET_LIMITS } from '../../utils/constants.js';
import { getActionErrorMessage } from '../../utils/errorMessages.js';
import './tickets.css';

export function ResolveTicketModal({ open, onClose, onConfirm, pending = false }) {
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: { resolution: '' },
  });

  const resolution = watch('resolution') || '';

  useEffect(() => {
    if (open) {
      reset({ resolution: '' });
      setServerError('');
    }
  }, [open, reset]);

  async function submit(values) {
    setServerError('');
    try {
      await onConfirm(values.resolution.trim());
      reset({ resolution: '' });
      onClose();
    } catch (error) {
      setServerError(
        getActionErrorMessage(
          error,
          'Não foi possível solicitar a confirmação. Tente novamente.',
        ),
      );
    }
  }

  return (
    <Modal
      open={open}
      onClose={pending ? () => {} : onClose}
      title="Solicitar confirmação"
      description="Descreva a solução aplicada. O chamado irá para Aguardando solicitante e só será encerrado após a confirmação do solicitante."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="resolve-ticket-form"
            loading={pending}
            disabled={pending}
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            {pending ? 'Enviando…' : 'Solicitar confirmação'}
          </Button>
        </>
      }
    >
      <form id="resolve-ticket-form" onSubmit={handleSubmit(submit)} noValidate>
        {serverError ? (
          <div className="form-alert form-alert--error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <Textarea
          id="resolution-text"
          label="Solução proposta"
          required
          placeholder="Ex.: cabo substituído, serviço reiniciado e teste validado com o solicitante."
          rows={6}
          maxLength={TICKET_LIMITS.RESOLUTION_MAX}
          value={resolution}
          hint="A solução será enviada ao solicitante para confirmação e registrada no histórico de auditoria."
          error={errors.resolution?.message}
          {...register('resolution', {
            required: 'Descreva a solução aplicada.',
            minLength: {
              value: TICKET_LIMITS.RESOLUTION_MIN,
              message: `A solução deve ter pelo menos ${TICKET_LIMITS.RESOLUTION_MIN} caracteres.`,
            },
            maxLength: {
              value: TICKET_LIMITS.RESOLUTION_MAX,
              message: `A solução deve ter no máximo ${TICKET_LIMITS.RESOLUTION_MAX} caracteres.`,
            },
          })}
        />
      </form>
    </Modal>
  );
}
