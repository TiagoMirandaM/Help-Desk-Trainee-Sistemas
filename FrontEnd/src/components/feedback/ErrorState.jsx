import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import './feedback.css';

export function ErrorState({
  title = 'Não foi possível carregar os dados',
  message = 'Ocorreu um erro inesperado. Tente novamente.',
  onRetry,
  retryLabel = 'Tentar novamente',
  compact = false,
}) {
  return (
    <div
      className={`error-state ${compact ? 'error-state--compact' : ''}`.trim()}
      role="alert"
    >
      <span className="error-state__icon" aria-hidden="true">
        <AlertTriangle size={compact ? 20 : 24} />
      </span>
      <div className="error-state__content">
        <h3 className="error-state__title">{title}</h3>
        <p className="error-state__message">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} className="error-state__retry">
          <RefreshCw size={14} aria-hidden="true" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
