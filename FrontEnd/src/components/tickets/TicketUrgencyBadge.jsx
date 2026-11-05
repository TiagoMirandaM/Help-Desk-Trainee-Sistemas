import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';
import { URGENCY_LABELS, URGENCY_TONES } from '../../utils/constants.js';
import './tickets.css';

const ICONS = {
  BAIXA: ArrowDown,
  MEDIA: Minus,
  ALTA: ArrowUp,
};

export function TicketUrgencyBadge({ urgency }) {
  const Icon = ICONS[urgency];

  return (
    <Badge tone={URGENCY_TONES[urgency] || 'neutral'} icon={Icon}>
      {URGENCY_LABELS[urgency] || urgency || 'A definir'}
    </Badge>
  );
}
