import { getUserName, getInitials } from '../../utils/formatters.js';
import './ui.css';

export function Avatar({ user, size = 'md' }) {
  return (
    <span
      className={`avatar avatar--${size}`}
      title={getUserName(user)}
      aria-label={getUserName(user)}
    >
      {getInitials(user)}
    </span>
  );
}
