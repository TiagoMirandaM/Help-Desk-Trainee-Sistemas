import { useState } from 'react';
import { Lock, MessageSquare, Send } from 'lucide-react';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Textarea } from '../ui/Textarea.jsx';
import { formatDateTime } from '../../utils/formatDate.js';
import { getUserName } from '../../utils/formatters.js';
import './tickets.css';

const COMMENT_MAX_LENGTH = 2000;

export function TicketComments({ comments = [], submitting = false, onSubmit }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const text = content.trim();

    if (!text) {
      setError('Escreva um comentário antes de enviar.');
      return;
    }

    setError('');

    try {
      await onSubmit(text);
      setContent('');
    } catch {
      // O texto é preservado para nova tentativa; o erro é notificado pela página.
    }
  }

  return (
    <section className="panel comments" aria-labelledby="comments-title">
      <div className="panel__header">
        <div>
          <h2 className="panel__title inline" id="comments-title">
            <MessageSquare size={17} aria-hidden="true" />
            Comentários internos
          </h2>
          <p className="panel__subtitle">
            <Lock size={12} aria-hidden="true" /> Visível apenas para a equipe de suporte.
          </p>
        </div>
        <span className="comments__count">{comments.length}</span>
      </div>

      <div className="comments__list">
        {comments.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Nenhum comentário interno"
            description="Registre observações técnicas para dar contexto ao atendimento."
            compact
          />
        ) : (
          <ul className="comments__items">
            {comments.map((comment) => (
              <li key={comment.id} className="comment">
                <Avatar user={comment.author} size="sm" />
                <div className="comment__body">
                  <div className="comment__meta">
                    <strong>{getUserName(comment.author)}</strong>
                    <time dateTime={comment.createdAt || undefined}>
                      {formatDateTime(comment.createdAt)}
                    </time>
                  </div>
                  <p className="comment__content">{comment.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className="comments__composer" onSubmit={handleSubmit} noValidate>
        <Textarea
          id="internal-comment"
          label="Novo comentário interno"
          placeholder="Adicione uma observação técnica sobre o atendimento…"
          rows={3}
          maxLength={COMMENT_MAX_LENGTH}
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            if (error) setError('');
          }}
          error={error}
        />
        <div className="comments__composer-actions">
          <Button type="submit" size="sm" loading={submitting} disabled={submitting}>
            <Send size={14} aria-hidden="true" />
            {submitting ? 'Enviando…' : 'Comentar'}
          </Button>
        </div>
      </form>
    </section>
  );
}
