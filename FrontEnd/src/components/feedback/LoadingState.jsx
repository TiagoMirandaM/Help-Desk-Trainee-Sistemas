import { Spinner } from '../ui/Spinner.jsx';
import './feedback.css';

export function LoadingState({ label = 'Carregando…', compact = false }) {
  return (
    <div className={`loading-state ${compact ? 'loading-state--compact' : ''}`.trim()} aria-live="polite">
      <Spinner size={compact ? 18 : 24} label={label} />
      <p className="loading-state__label">{label}</p>
    </div>
  );
}
