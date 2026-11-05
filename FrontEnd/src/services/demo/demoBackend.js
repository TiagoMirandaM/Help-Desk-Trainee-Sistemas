import {
  ROLES,
  STATUS_LABELS,
  TICKET_STATUS,
  URGENCIES,
  URGENCY_LABELS,
} from '../../utils/constants.js';
import { ApiError } from '../apiError.js';
import { createDemoSeed } from './demoSeed.js';

const DB_KEY = 'helpdesk.demo.db.v1';
const SESSION_KEY = 'helpdesk.demo.session.v1';
const LATENCY_MS = 320;

let cache = null;

function delay(ms = LATENCY_MS) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function readStorage(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // A demonstração continua funcionando em memória se o storage estiver indisponível.
  }
}

function removeStorage(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignora ambientes sem sessionStorage.
  }
}

function saveDb(db) {
  cache = db;
  writeStorage(DB_KEY, JSON.stringify(db));
}

function normalizeLegacyOpenTickets(db) {
  let changed = false;

  db.tickets.forEach((ticket) => {
    if (ticket.status === TICKET_STATUS.OPEN && ticket.urgency != null) {
      ticket.urgency = null;
      changed = true;
    }
  });

  return changed;
}

function loadDb() {
  if (cache) return cache;

  const raw = readStorage(DB_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1 && Array.isArray(parsed.tickets)) {
        if (normalizeLegacyOpenTickets(parsed)) {
          saveDb(parsed);
        } else {
          cache = parsed;
        }
        return cache;
      }
    } catch {
      // Base corrompida: recria os dados de demonstração.
    }
  }

  cache = createDemoSeed();
  saveDb(cache);
  return cache;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return clone(safe);
}

function sanitizeTicket(ticket) {
  if (!ticket) return null;
  return {
    ...clone(ticket),
    requester: publicUser(ticket.requester),
    assignee: publicUser(ticket.assignee),
  };
}

function sanitizeComment(comment) {
  return {
    ...clone(comment),
    author: publicUser(comment.author),
  };
}

function sanitizeHistory(event) {
  return {
    ...clone(event),
    actor: publicUser(event.actor),
  };
}

function getSessionUser(db) {
  const userId = readStorage(SESSION_KEY);
  if (!userId) return null;
  return db.users.find((user) => String(user.id) === String(userId)) || null;
}

function requireUser() {
  const db = loadDb();
  const user = getSessionUser(db);
  if (!user) {
    throw new ApiError('Sessão de demonstração não iniciada.', { status: 401 });
  }
  return { db, user };
}

function requireTechnician(user) {
  if (user.role !== ROLES.TECHNICIAN) {
    throw new ApiError('Ação permitida apenas para técnicos.', { status: 403 });
  }
}

function findTicket(db, id) {
  const ticket = db.tickets.find((item) => String(item.id) === String(id));
  if (!ticket) {
    throw new ApiError('Chamado não encontrado.', { status: 404 });
  }
  return ticket;
}

function canAccessTicket(ticket, user) {
  if (user.role === ROLES.TECHNICIAN) return true;
  return String(ticket.requester?.id) === String(user.id);
}

function getAccessibleTicket(db, user, id) {
  const ticket = findTicket(db, id);
  if (!canAccessTicket(ticket, user)) {
    throw new ApiError('Chamado não encontrado.', { status: 404 });
  }
  return ticket;
}

function addHistory(db, ticketId, event, actor) {
  const entry = {
    id: db.nextHistoryId,
    ticketId,
    event_type: event.type,
    actor: publicUser(actor),
    description: event.description || null,
    from_status: event.fromStatus || null,
    to_status: event.toStatus || null,
    created_at: new Date().toISOString(),
  };
  db.nextHistoryId += 1;
  db.history.push(entry);
  return entry;
}

function nowIso() {
  return new Date().toISOString();
}

function resolveCategory(db, value) {
  if (!value) return null;
  const key = String(value).toLowerCase();
  return (
    db.categories.find(
      (item) =>
        String(item.id).toLowerCase() === key ||
        String(item.slug).toLowerCase() === key ||
        String(item.name).toLowerCase() === key,
    ) || null
  );
}

function compareBy(field, direction) {
  return (a, b) => {
    let valueA = a[field];
    let valueB = b[field];

    if (field === 'urgency') {
      const weight = { BAIXA: 1, MEDIA: 2, ALTA: 3 };
      valueA = weight[a.urgency] || 0;
      valueB = weight[b.urgency] || 0;
    } else {
      valueA = new Date(a[field] || 0).getTime();
      valueB = new Date(b[field] || 0).getTime();
    }

    if (valueA === valueB) return 0;
    return (valueA < valueB ? -1 : 1) * direction;
  };
}

export async function login({ username, password }) {
  await delay();
  const db = loadDb();
  const key = String(username || '').trim().toLowerCase();
  const user = db.users.find(
    (item) =>
      String(item.email || '').toLowerCase() === key ||
      String(item.username || '').toLowerCase() === key,
  );

  if (!user || password !== user.password) {
    throw new ApiError('Usuário ou senha inválidos.', { status: 401, code: 'invalid_credentials' });
  }

  writeStorage(SESSION_KEY, String(user.id));
  return { user: publicUser(user) };
}

export async function me() {
  await delay(120);
  const { user } = requireUser();
  return { user: publicUser(user) };
}

export async function logout() {
  await delay(120);
  removeStorage(SESSION_KEY);
}

export async function listCategories() {
  await delay(120);
  const { db } = requireUser();
  return { count: db.categories.length, results: clone(db.categories), next: null, previous: null };
}

export async function listTickets(filters = {}) {
  await delay();
  const { db, user } = requireUser();

  let items = db.tickets.filter((ticket) => canAccessTicket(ticket, user));

  const search = String(filters.search || '').trim().toLowerCase();
  if (search) {
    items = items.filter(
      (ticket) =>
        ticket.title.toLowerCase().includes(search) ||
        String(ticket.code || '').toLowerCase().includes(search) ||
        String(ticket.id).includes(search),
    );
  }

  if (filters.status) {
    const statuses = String(filters.status)
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
    items = items.filter((ticket) => statuses.includes(ticket.status));
  }

  if (filters.urgency) {
    const urgencies = String(filters.urgency)
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
    items = items.filter((ticket) => urgencies.includes(ticket.urgency));
  }

  if (filters.category) {
    const category = resolveCategory(db, filters.category);
    if (category) {
      items = items.filter((ticket) => String(ticket.category?.id) === String(category.id));
    }
  }

  if (filters.assignee) {
    if (filters.assignee === 'me') {
      items = items.filter((ticket) => String(ticket.assignee?.id) === String(user.id));
    } else {
      items = items.filter(
        (ticket) => String(ticket.assignee?.id) === String(filters.assignee),
      );
    }
  }

  if (filters.mine) {
    if (user.role === ROLES.TECHNICIAN) {
      items = items.filter((ticket) => String(ticket.assignee?.id) === String(user.id));
    } else {
      items = items.filter((ticket) => String(ticket.requester?.id) === String(user.id));
    }
  }

  const ordering = filters.ordering || '-created_at';
  const descending = ordering.startsWith('-');
  const field = ordering.replace(/^-/, '') || 'created_at';
  const sortField = ['created_at', 'updated_at', 'urgency', 'id'].includes(field)
    ? field
    : 'created_at';
  items = [...items].sort(compareBy(sortField, descending ? -1 : 1));

  const page = Math.max(Number(filters.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(filters.page_size) || 10, 1), 500);
  const count = items.length;
  const start = (page - 1) * pageSize;
  const results = items.slice(start, start + pageSize);

  return {
    count,
    next: start + pageSize < count ? page + 1 : null,
    previous: page > 1 ? page - 1 : null,
    results: results.map(sanitizeTicket),
  };
}

export async function getTicket(id) {
  await delay();
  const { db, user } = requireUser();
  const ticket = getAccessibleTicket(db, user, id);
  return sanitizeTicket(ticket);
}

export async function createTicket(payload) {
  await delay();
  const { db, user } = requireUser();

  const title = String(payload.title || '').trim();
  const description = String(payload.description || '').trim();
  const category = resolveCategory(db, payload.category);

  if (title.length < 5 || description.length < 20 || !category) {
    throw new ApiError('Revise os dados do chamado antes de enviar.', {
      status: 400,
      code: 'invalid_ticket',
    });
  }

  const id = db.nextTicketId;
  db.nextTicketId += 1;
  const timestamp = nowIso();

  const ticket = {
    id,
    code: `HD-${String(id).padStart(4, '0')}`,
    title,
    description,
    category: clone(category),
    urgency: null,
    status: TICKET_STATUS.OPEN,
    requester: publicUser(user),
    assignee: null,
    created_at: timestamp,
    updated_at: timestamp,
    resolved_at: null,
    resolution: null,
  };

  db.tickets.push(ticket);
  addHistory(
    db,
    ticket.id,
    {
      type: 'CREATED',
      description: 'Chamado aberto pelo solicitante.',
      toStatus: TICKET_STATUS.OPEN,
    },
    user,
  );
  saveDb(db);

  return sanitizeTicket(ticket);
}

export async function assignTicket(id, urgency) {
  await delay();
  const { db, user } = requireUser();
  requireTechnician(user);
  const ticket = findTicket(db, id);

  if (ticket.status !== TICKET_STATUS.OPEN || ticket.assignee) {
    throw new ApiError('Este chamado já foi assumido por outro técnico.', { status: 409 });
  }

  const targetUrgency = String(urgency || '').toUpperCase();
  if (!URGENCIES.includes(targetUrgency)) {
    throw new ApiError('Informe uma urgência válida antes de assumir o chamado.', {
      status: 400,
    });
  }

  const previousUrgency = ticket.urgency;
  ticket.assignee = publicUser(user);
  ticket.urgency = targetUrgency;
  ticket.status = TICKET_STATUS.IN_PROGRESS;
  ticket.updated_at = nowIso();

  addHistory(
    db,
    ticket.id,
    {
      type: 'ASSIGNED',
      description: `Chamado assumido por ${user.name}.`,
      fromStatus: TICKET_STATUS.OPEN,
      toStatus: TICKET_STATUS.IN_PROGRESS,
    },
    user,
  );
  addHistory(
    db,
    ticket.id,
    {
      type: 'URGENCY_CHANGED',
      description:
        previousUrgency && previousUrgency !== targetUrgency
          ? `Urgência alterada de ${URGENCY_LABELS[previousUrgency] || previousUrgency} para ${URGENCY_LABELS[targetUrgency] || targetUrgency}.`
          : `Urgência definida como ${URGENCY_LABELS[targetUrgency] || targetUrgency}.`,
    },
    user,
  );

  saveDb(db);
  return sanitizeTicket(ticket);
}

export async function transitionTicket(id, status) {
  await delay();
  const { db, user } = requireUser();
  requireTechnician(user);
  const ticket = findTicket(db, id);

  if (String(ticket.assignee?.id) !== String(user.id)) {
    throw new ApiError('Apenas o técnico responsável pode alterar o status.', { status: 403 });
  }

  if (ticket.status === TICKET_STATUS.RESOLVED) {
    throw new ApiError('Chamado resolvido não pode ser reaberto.', { status: 409 });
  }

  const target = String(status || '').toUpperCase();

  if (target === TICKET_STATUS.RESOLVED) {
    throw new ApiError('Utilize a ação de resolução para concluir o chamado.', { status: 400 });
  }

  const allowed = {
    [TICKET_STATUS.IN_PROGRESS]: [TICKET_STATUS.WAITING_REQUESTER],
    [TICKET_STATUS.WAITING_REQUESTER]: [TICKET_STATUS.IN_PROGRESS],
  };

  if (!(allowed[ticket.status] || []).includes(target)) {
    throw new ApiError('Transição de status não permitida.', { status: 400 });
  }

  const previous = ticket.status;
  ticket.status = target;
  ticket.updated_at = nowIso();

  if (target === TICKET_STATUS.WAITING_REQUESTER && !ticket.resolution) {
    ticket.resolution = 'Atendimento aguardando confirmação do solicitante.';
  }
  if (
    previous === TICKET_STATUS.WAITING_REQUESTER &&
    target === TICKET_STATUS.IN_PROGRESS
  ) {
    ticket.resolution = null;
    ticket.resolved_at = null;
  }

  addHistory(
    db,
    ticket.id,
    {
      type: 'STATUS_CHANGED',
      description: `Status alterado de ${STATUS_LABELS[previous]} para ${STATUS_LABELS[target]}.`,
      fromStatus: previous,
      toStatus: target,
    },
    user,
  );

  saveDb(db);
  return sanitizeTicket(ticket);
}

export async function resolveTicket(id, resolution) {
  await delay();
  const { db, user } = requireUser();
  requireTechnician(user);
  const ticket = findTicket(db, id);

  if (String(ticket.assignee?.id) !== String(user.id)) {
    throw new ApiError('Apenas o técnico responsável pode resolver o chamado.', { status: 403 });
  }

  if (ticket.status !== TICKET_STATUS.IN_PROGRESS) {
    throw new ApiError(
      'Somente chamados em atendimento podem ser enviados para confirmação.',
      { status: 409 },
    );
  }

  const text = String(resolution || '').trim();
  if (text.length < 10) {
    throw new ApiError('Descreva a solução aplicada com pelo menos 10 caracteres.', { status: 400 });
  }

  const timestamp = nowIso();
  ticket.status = TICKET_STATUS.WAITING_REQUESTER;
  ticket.resolution = text;
  ticket.resolved_at = null;
  ticket.updated_at = timestamp;

  addHistory(
    db,
    ticket.id,
    {
      type: 'STATUS_CHANGED',
      description: 'Solução proposta e confirmação solicitada ao solicitante.',
      fromStatus: TICKET_STATUS.IN_PROGRESS,
      toStatus: TICKET_STATUS.WAITING_REQUESTER,
    },
    user,
  );
  addHistory(
    db,
    ticket.id,
    {
      type: 'CONFIRMATION_REQUESTED',
      description: 'Confirmação de resolução solicitada ao solicitante.',
      fromStatus: TICKET_STATUS.IN_PROGRESS,
      toStatus: TICKET_STATUS.WAITING_REQUESTER,
    },
    user,
  );

  saveDb(db);
  return sanitizeTicket(ticket);
}

export async function confirmResolution(id, resolved) {
  await delay();
  const { db, user } = requireUser();
  const ticket = getAccessibleTicket(db, user, id);

  if (user.role !== ROLES.REQUESTER || String(ticket.requester?.id) !== String(user.id)) {
    throw new ApiError('Apenas o solicitante do chamado pode confirmar a resolução.', {
      status: 403,
    });
  }
  if (ticket.status === TICKET_STATUS.RESOLVED) {
    throw new ApiError('Este chamado já foi resolvido.', { status: 409 });
  }
  if (ticket.status !== TICKET_STATUS.WAITING_REQUESTER) {
    throw new ApiError(
      'A confirmação só está disponível quando o chamado aguarda o solicitante.',
      { status: 409 },
    );
  }

  const timestamp = nowIso();

  if (resolved === true) {
    ticket.status = TICKET_STATUS.RESOLVED;
    ticket.resolution =
      ticket.resolution || 'Resolução confirmada pelo solicitante.';
    ticket.resolved_at = timestamp;
    ticket.updated_at = timestamp;

    addHistory(
      db,
      ticket.id,
      {
        type: 'REQUESTER_CONFIRMED',
        description: 'Solicitante confirmou que o problema foi resolvido.',
        fromStatus: TICKET_STATUS.WAITING_REQUESTER,
        toStatus: TICKET_STATUS.RESOLVED,
      },
      user,
    );
    addHistory(
      db,
      ticket.id,
      {
        type: 'RESOLVED_BY_REQUESTER',
        description: 'Chamado resolvido por confirmação do solicitante.',
        fromStatus: TICKET_STATUS.WAITING_REQUESTER,
        toStatus: TICKET_STATUS.RESOLVED,
      },
      user,
    );
  } else {
    ticket.status = TICKET_STATUS.IN_PROGRESS;
    ticket.resolution = null;
    ticket.resolved_at = null;
    ticket.updated_at = timestamp;

    addHistory(
      db,
      ticket.id,
      {
        type: 'REQUESTER_REJECTED',
        description: 'Solicitante informou que o problema continua.',
        fromStatus: TICKET_STATUS.WAITING_REQUESTER,
        toStatus: TICKET_STATUS.IN_PROGRESS,
      },
      user,
    );
    addHistory(
      db,
      ticket.id,
      {
        type: 'RETURNED_TO_SERVICE',
        description: 'Chamado retornou para atendimento.',
        fromStatus: TICKET_STATUS.WAITING_REQUESTER,
        toStatus: TICKET_STATUS.IN_PROGRESS,
      },
      user,
    );
  }

  saveDb(db);
  return sanitizeTicket(ticket);
}

export async function listComments(ticketId) {
  await delay();
  const { db, user } = requireUser();
  requireTechnician(user);
  getAccessibleTicket(db, user, ticketId);

  const results = db.comments
    .filter((comment) => String(comment.ticketId) === String(ticketId))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(sanitizeComment);

  return { count: results.length, next: null, previous: null, results };
}

export async function createComment(ticketId, content) {
  await delay();
  const { db, user } = requireUser();
  requireTechnician(user);
  getAccessibleTicket(db, user, ticketId);

  const text = String(content || '').trim();
  if (!text) {
    throw new ApiError('Escreva um comentário antes de enviar.', { status: 400 });
  }
  if (text.length > 2000) {
    throw new ApiError('O comentário deve ter no máximo 2000 caracteres.', { status: 400 });
  }

  const comment = {
    id: db.nextCommentId,
    ticketId: Number(ticketId),
    author: publicUser(user),
    content: text,
    created_at: nowIso(),
  };

  db.nextCommentId += 1;
  db.comments.push(comment);
  saveDb(db);
  return sanitizeComment(comment);
}

export async function listHistory(ticketId) {
  await delay();
  const { db, user } = requireUser();
  requireTechnician(user);
  getAccessibleTicket(db, user, ticketId);

  const results = db.history
    .filter((event) => String(event.ticketId) === String(ticketId))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(sanitizeHistory);

  return { count: results.length, next: null, previous: null, results };
}

export function resetDemoData() {
  cache = null;
  removeStorage(DB_KEY);
  removeStorage(SESSION_KEY);
}
