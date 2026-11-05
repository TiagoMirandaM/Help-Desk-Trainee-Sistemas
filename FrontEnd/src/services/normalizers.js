import { ROLES, TICKET_STATUS, URGENCIES } from '../utils/constants.js';

const ROLE_ALIASES = {
  SOLICITANTE: ROLES.REQUESTER,
  REQUESTER: ROLES.REQUESTER,
  CLIENTE: ROLES.REQUESTER,
  TECNICO: ROLES.TECHNICIAN,
  TÉCNICO: ROLES.TECHNICIAN,
  TECHNICIAN: ROLES.TECHNICIAN,
  TECH: ROLES.TECHNICIAN,
  AGENT: ROLES.TECHNICIAN,
};

const STATUS_ALIASES = {
  ABERTO: TICKET_STATUS.OPEN,
  OPEN: TICKET_STATUS.OPEN,
  EM_ATENDIMENTO: TICKET_STATUS.IN_PROGRESS,
  IN_PROGRESS: TICKET_STATUS.IN_PROGRESS,
  AGUARDANDO_SOLICITANTE: TICKET_STATUS.WAITING_REQUESTER,
  WAITING_REQUESTER: TICKET_STATUS.WAITING_REQUESTER,
  WAITING: TICKET_STATUS.WAITING_REQUESTER,
  RESOLVIDO: TICKET_STATUS.RESOLVED,
  RESOLVED: TICKET_STATUS.RESOLVED,
};

export function normalizeStatus(value) {
  if (!value) return null;
  return STATUS_ALIASES[String(value).toUpperCase()] || String(value).toUpperCase();
}

export function normalizeUrgency(value) {
  if (!value) return null;
  const normalized = String(value).toUpperCase();
  return URGENCIES.includes(normalized) ? normalized : normalized;
}

export function normalizeRole(value) {
  if (!value) return null;
  return ROLE_ALIASES[String(value).toUpperCase()] || String(value).toUpperCase();
}

export function normalizeUser(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    return { id: raw, username: raw, name: raw, email: null, role: null, department: null };
  }

  const profile = raw.profile || {};
  const firstName = raw.first_name || profile.first_name || '';
  const lastName = raw.last_name || profile.last_name || '';
  const fullName =
    raw.name ||
    raw.full_name ||
    raw.display_name ||
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    raw.username ||
    raw.email ||
    '';

  return {
    id: raw.id ?? raw.pk ?? raw.uuid ?? raw.username ?? raw.email,
    username: raw.username || raw.email || '',
    name: fullName,
    firstName,
    lastName,
    email: raw.email || profile.email || '',
    role: normalizeRole(raw.role || profile.role || raw.user_type || raw.kind),
    department: raw.department || profile.department || raw.sector || null,
    dateJoined: raw.date_joined || raw.created_at || null,
  };
}

export function normalizeCategory(raw) {
  if (!raw) return null;
  if (typeof raw === 'string' || typeof raw === 'number') {
    return { id: raw, slug: String(raw).toLowerCase(), name: String(raw) };
  }

  return {
    id: raw.id ?? raw.slug ?? raw.name,
    slug: raw.slug || String(raw.name || raw.id || '').toLowerCase(),
    name: raw.name || raw.label || raw.title || raw.slug || String(raw.id ?? ''),
  };
}

export function normalizeTicket(raw) {
  if (!raw) return null;

  const category = normalizeCategory(
    raw.category ||
      (raw.category_name
        ? { id: raw.category_id ?? raw.category, name: raw.category_name }
        : raw.category_id),
  );

  const requester = normalizeUser(
    raw.requester || raw.created_by || raw.requester_user || raw.user,
  );

  const assignee = normalizeUser(
    raw.assignee || raw.technician || raw.assigned_to || raw.assignee_user,
  );

  return {
    id: raw.id ?? raw.pk ?? raw.uuid,
    code: raw.code || raw.protocol || raw.number || raw.ticket_number || null,
    title: raw.title || raw.subject || '',
    description: raw.description || raw.body || '',
    status: normalizeStatus(raw.status),
    urgency: normalizeUrgency(raw.urgency || raw.priority),
    category,
    requester,
    assignee,
    createdAt: raw.created_at || raw.createdAt || raw.opened_at || null,
    updatedAt: raw.updated_at || raw.updatedAt || raw.modified_at || null,
    resolvedAt: raw.resolved_at || raw.resolvedAt || raw.closed_at || null,
    resolution:
      raw.resolution ||
      raw.resolution_text ||
      raw.resolution_notes ||
      raw.solution ||
      null,
  };
}

export function normalizeComment(raw) {
  if (!raw) return null;
  return {
    id: raw.id ?? raw.pk,
    author: normalizeUser(raw.author || raw.user || raw.created_by),
    content: raw.content || raw.text || raw.body || '',
    createdAt: raw.created_at || raw.createdAt || null,
  };
}

const HISTORY_LABELS = {
  CREATED: 'Chamado criado',
  TICKET_CREATED: 'Chamado criado',
  ASSIGNED: 'Técnico atribuído',
  TICKET_ASSIGNED: 'Técnico atribuído',
  STATUS_CHANGED: 'Status alterado',
  TRANSITION: 'Status alterado',
  STATUS_UPDATED: 'Status alterado',
  URGENCY_CHANGED: 'Urgência definida',
  CONFIRMATION_REQUESTED: 'Confirmação solicitada',
  REQUESTER_CONFIRMED: 'Solicitante confirmou a resolução',
  REQUESTER_REJECTED: 'Solicitante informou que o problema continua',
  RETURNED_TO_SERVICE: 'Chamado retornou ao atendimento',
  RESOLVED_BY_REQUESTER: 'Chamado resolvido por confirmação',
  RESOLVED: 'Chamado resolvido',
  TICKET_RESOLVED: 'Chamado resolvido',
};

export function normalizeHistoryEvent(raw) {
  if (!raw) return null;
  const type = String(raw.event_type || raw.action || raw.type || 'UPDATED').toUpperCase();

  return {
    id: raw.id ?? `${type}-${raw.created_at}`,
    type,
    label: raw.label || HISTORY_LABELS[type] || type,
    actor: normalizeUser(raw.actor || raw.user || raw.performed_by || raw.created_by),
    description: raw.description || raw.message || raw.note || null,
    fromStatus: normalizeStatus(raw.from_status || raw.old_status || raw.previous_status),
    toStatus: normalizeStatus(raw.to_status || raw.new_status || raw.status),
    createdAt: raw.created_at || raw.createdAt || raw.timestamp || null,
  };
}

export function normalizeListResponse(data) {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      results: data,
      hasNext: false,
      hasPrevious: false,
    };
  }

  if (!data || typeof data !== 'object') {
    return { count: 0, results: [], hasNext: false, hasPrevious: false };
  }

  const results = Array.isArray(data.results)
    ? data.results
    : Array.isArray(data.data)
      ? data.data
      : [];

  return {
    count: typeof data.count === 'number' ? data.count : results.length,
    results,
    hasNext: Boolean(data.next),
    hasPrevious: Boolean(data.previous),
  };
}

export function normalizeTicketList(data) {
  const list = normalizeListResponse(data);
  return {
    ...list,
    results: list.results.map(normalizeTicket),
  };
}

export function normalizeCommentList(data) {
  const list = normalizeListResponse(data);
  return {
    ...list,
    results: list.results.map(normalizeComment),
  };
}

export function normalizeHistoryList(data) {
  const list = normalizeListResponse(data);
  return {
    ...list,
    results: list.results.map(normalizeHistoryEvent),
  };
}
