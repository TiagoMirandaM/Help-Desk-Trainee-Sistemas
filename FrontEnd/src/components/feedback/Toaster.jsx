import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import './feedback.css';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function Toaster({ toasts, onDismiss }) {
  return (
    <div className="toast-region" role="region" aria-label="Notificações" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] || Info;
        return (
          <div
            key={toast.id}
            className={`toast toast--${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <span className="toast__icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <div className="toast__content">
              <p className="toast__title">{toast.title}</p>
              {toast.message ? <p className="toast__message">{toast.message}</p> : null}
            </div>
            <button
              type="button"
              className="toast__close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Fechar notificação"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
