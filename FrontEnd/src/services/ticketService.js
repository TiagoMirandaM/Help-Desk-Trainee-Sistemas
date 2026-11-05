import { DEMO_MODE } from '../utils/env.js';
import { api } from './api.js';
import { normalizeTicket, normalizeTicketList } from './normalizers.js';
import * as demo from './demo/demoBackend.js';

function toApiFilters(filters = {}) {
  const params = {};

  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.urgency) params.urgency = filters.urgency;
  if (filters.category) {
    params.category =
      typeof filters.category === 'object'
        ? filters.category.id ?? filters.category.slug
        : filters.category;
  }
  if (filters.assignee) {
    params.assignee =
      typeof filters.assignee === 'object'
        ? filters.assignee.id ?? filters.assignee.username
        : filters.assignee;
  }
  if (filters.ordering) params.ordering = filters.ordering;
  if (filters.mine) params.mine = true;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  return params;
}

export async function listTickets(filters = {}) {
  if (DEMO_MODE) {
    const data = await demo.listTickets(filters);
    return normalizeTicketList(data);
  }

  const { data } = await api.get('/tickets/', { params: toApiFilters(filters) });
  return normalizeTicketList(data);
}

export async function getTicket(id) {
  if (DEMO_MODE) {
    const data = await demo.getTicket(id);
    return normalizeTicket(data);
  }

  const { data } = await api.get(`/tickets/${id}/`);
  return normalizeTicket(data);
}

function toCreatePayload(payload) {
  return {
    title: payload.title,
    description: payload.description,
    category:
      typeof payload.category === 'object'
        ? payload.category.id ?? payload.category.slug
        : payload.category,
  };
}

export async function createTicket(payload) {
  if (DEMO_MODE) {
    const data = await demo.createTicket(toCreatePayload(payload));
    return normalizeTicket(data);
  }

  const { data } = await api.post('/tickets/', toCreatePayload(payload));
  return normalizeTicket(data);
}

export async function assignTicket(id, urgency) {
  if (DEMO_MODE) {
    const data = await demo.assignTicket(id, urgency);
    return normalizeTicket(data);
  }

  const { data } = await api.post(`/tickets/${id}/assign/`, { urgency });
  return normalizeTicket(data);
}

export async function transitionTicket(id, status) {
  if (DEMO_MODE) {
    const data = await demo.transitionTicket(id, status);
    return normalizeTicket(data);
  }

  const { data } = await api.post(`/tickets/${id}/transition/`, { status });
  return normalizeTicket(data);
}

export async function resolveTicket(id, resolution) {
  if (DEMO_MODE) {
    const data = await demo.resolveTicket(id, resolution);
    return normalizeTicket(data);
  }

  const { data } = await api.post(`/tickets/${id}/resolve/`, { resolution });
  return normalizeTicket(data);
}

export async function confirmResolution(id, resolved) {
  if (DEMO_MODE) {
    const data = await demo.confirmResolution(id, resolved);
    return normalizeTicket(data);
  }

  const { data } = await api.post(`/tickets/${id}/confirm-resolution/`, { resolved });
  return normalizeTicket(data);
}
