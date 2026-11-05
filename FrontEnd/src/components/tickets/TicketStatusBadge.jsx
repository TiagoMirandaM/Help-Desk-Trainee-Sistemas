import { Badge } from '../ui/Badge.jsx';
import { STATUS_LABELS, STATUS_TONES } from '../../utils/constants.js';
import './tickets.css';

export function TicketStatusBadge({ status }) {
  return (
    <Badge tone={STATUS_TONES[status] || 'neutral'} dot>
      {STATUS_LABELS[status] || status || '—'}
    </Badge>
  );
}
