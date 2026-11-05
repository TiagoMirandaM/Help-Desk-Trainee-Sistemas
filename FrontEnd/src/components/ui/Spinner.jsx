import { Loader2 } from 'lucide-react';
import './ui.css';

export function Spinner({ size = 20, label = 'Carregando' }) {
  return (
    <span className="spinner" role="status">
      <Loader2 className="spinner__icon" size={size} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
