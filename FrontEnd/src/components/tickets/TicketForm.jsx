import { useForm } from 'react-hook-form';
import { AlertCircle, Send } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Select } from '../ui/Select.jsx';
import { Textarea } from '../ui/Textarea.jsx';
import { TICKET_LIMITS } from '../../utils/constants.js';
import './tickets.css';

export function TicketForm({ categories = [], onSubmit, submitting = false, submitError = '' }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      category: '',
      description: '',
    },
  });

  const description = watch('description') || '';

  async function submit(values) {
    await onSubmit(values);
  }

  return (
    <form
      className="ticket-form"
      noValidate
      onSubmit={handleSubmit(submit)}
      aria-label="Formulário de abertura de chamado"
    >
      {submitError ? (
        <div className="form-alert form-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{submitError}</span>
        </div>
      ) : null}

      <div className="ticket-form__grid">
        <Input
          id="ticket-title"
          label="Título"
          required
          placeholder="Resumo objetivo do problema"
          maxLength={TICKET_LIMITS.TITLE_MAX}
          error={errors.title?.message}
          {...register('title', {
            required: 'Informe um título para o chamado.',
            minLength: {
              value: TICKET_LIMITS.TITLE_MIN,
              message: `O título deve ter pelo menos ${TICKET_LIMITS.TITLE_MIN} caracteres.`,
            },
            maxLength: {
              value: TICKET_LIMITS.TITLE_MAX,
              message: `O título deve ter no máximo ${TICKET_LIMITS.TITLE_MAX} caracteres.`,
            },
          })}
        />

        <Select
          id="ticket-category"
          label="Categoria"
          required
          placeholder="Selecione a categoria"
          error={errors.category?.message}
          options={categories.map((category) => ({
            value: String(category.id),
            label: category.name,
          }))}
          {...register('category', {
            required: 'Selecione uma categoria.',
          })}
        />
      </div>

      <Textarea
        id="ticket-description"
        label="Descrição detalhada"
        required
        placeholder="Descreva o problema, o impacto e o que já foi tentado."
        rows={7}
        maxLength={TICKET_LIMITS.DESCRIPTION_MAX}
        value={description}
        hint="Inclua informações que ajudem a equipe de suporte a reproduzir e resolver o problema."
        error={errors.description?.message}
        {...register('description', {
          required: 'Descreva o problema do chamado.',
          minLength: {
            value: TICKET_LIMITS.DESCRIPTION_MIN,
            message: `A descrição deve ter pelo menos ${TICKET_LIMITS.DESCRIPTION_MIN} caracteres.`,
          },
          maxLength: {
            value: TICKET_LIMITS.DESCRIPTION_MAX,
            message: `A descrição deve ter no máximo ${TICKET_LIMITS.DESCRIPTION_MAX} caracteres.`,
          },
        })}
      />

      <div className="ticket-form__actions">
        <p className="ticket-form__note">

        </p>
        <Button type="submit" loading={submitting}>
          <Send size={16} aria-hidden="true" />
          {submitting ? 'Enviando…' : 'Abrir chamado'}
        </Button>
      </div>
    </form>
  );
}