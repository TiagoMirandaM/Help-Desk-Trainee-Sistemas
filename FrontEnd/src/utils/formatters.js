import {
  ROLE_LABELS,
  STATUS_LABELS,
  URGENCY_LABELS,
} from './constants.js';

export function getUserName(user) {
  if (!user) return '—';
  if (user.name) return user.name;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return fullName || user.username || user.email || '—';
}

export function getInitials(user) {
  const name = getUserName(user);
  if (!name || name === '—') return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function formatTicketCode(ticket) {
  if (!ticket) return '—';
  if (ticket.code) return ticket.code;
  if (ticket.id === null || ticket.id === undefined) return '—';
  const numeric = Number(ticket.id);
  if (Number.isFinite(numeric)) return `#${String(numeric).padStart(4, '0')}`;
  return String(ticket.id);
}

export function formatStatus(status) {
  return STATUS_LABELS[status] || status || '—';
}

export function formatUrgency(urgency) {
  return URGENCY_LABELS[urgency] || urgency || '—';
}

export function formatRole(role) {
  return ROLE_LABELS[role] || role || '—';
}

export function formatCategory(category) {
  if (!category) return '—';
  if (typeof category === 'string') return category;
  return category.name || category.slug || '—';
}

export function formatCount(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}
