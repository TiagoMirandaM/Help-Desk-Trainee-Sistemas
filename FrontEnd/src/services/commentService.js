import { DEMO_MODE } from '../utils/env.js';
import { api } from './api.js';
import { normalizeComment, normalizeCommentList } from './normalizers.js';
import * as demo from './demo/demoBackend.js';

export async function listComments(ticketId) {
  if (DEMO_MODE) {
    const data = await demo.listComments(ticketId);
    return normalizeCommentList(data);
  }

  const { data } = await api.get(`/tickets/${ticketId}/comments/`);
  return normalizeCommentList(data);
}

export async function createComment(ticketId, content) {
  if (DEMO_MODE) {
    const data = await demo.createComment(ticketId, content);
    return normalizeComment(data);
  }

  const { data } = await api.post(`/tickets/${ticketId}/comments/`, { content });
  return normalizeComment(data);
}
