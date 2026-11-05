export const ROLES = Object.freeze({
  REQUESTER: 'SOLICITANTE',
  TECHNICIAN: 'TECNICO',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.REQUESTER]: 'Solicitante',
  [ROLES.TECHNICIAN]: 'Técnico',
});

export const TICKET_STATUS = Object.freeze({
  OPEN: 'ABERTO',
  IN_PROGRESS: 'EM_ATENDIMENTO',
  WAITING_REQUESTER: 'AGUARDANDO_SOLICITANTE',
  RESOLVED: 'RESOLVIDO',
});

export const STATUS_ORDER = Object.freeze([
  TICKET_STATUS.OPEN,
  TICKET_STATUS.IN_PROGRESS,
  TICKET_STATUS.WAITING_REQUESTER,
  TICKET_STATUS.RESOLVED,
]);

export const STATUS_LABELS = Object.freeze({
  [TICKET_STATUS.OPEN]: 'Aberto',
  [TICKET_STATUS.IN_PROGRESS]: 'Em atendimento',
  [TICKET_STATUS.WAITING_REQUESTER]: 'Aguardando solicitante',
  [TICKET_STATUS.RESOLVED]: 'Resolvido',
});

export const STATUS_TONES = Object.freeze({
  [TICKET_STATUS.OPEN]: 'info',
  [TICKET_STATUS.IN_PROGRESS]: 'warning',
  [TICKET_STATUS.WAITING_REQUESTER]: 'violet',
  [TICKET_STATUS.RESOLVED]: 'success',
});

export const URGENCIES = Object.freeze(['BAIXA', 'MEDIA', 'ALTA']);

export const URGENCY_LABELS = Object.freeze({
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
});

export const URGENCY_TONES = Object.freeze({
  BAIXA: 'success',
  MEDIA: 'warning',
  ALTA: 'danger',
});

export const URGENCY_WEIGHT = Object.freeze({
  BAIXA: 1,
  MEDIA: 2,
  ALTA: 3,
});

export const TICKET_LIMITS = Object.freeze({
  TITLE_MIN: 5,
  TITLE_MAX: 120,
  DESCRIPTION_MIN: 20,
  DESCRIPTION_MAX: 2000,
  RESOLUTION_MIN: 10,
  RESOLUTION_MAX: 2000,
});

/**
 * Contrato assumido para o modo demonstração e para os rótulos padrão.
 * A API real pode fornecer as categorias por GET /categories/.
 */
export const FALLBACK_CATEGORIES = Object.freeze([
  { id: 'ti', slug: 'ti', name: 'TI' },
  { id: 'infraestrutura', slug: 'infraestrutura', name: 'Infraestrutura' },
  { id: 'financeiro', slug: 'financeiro', name: 'Financeiro' },
]);
