import { DEMO_MODE } from '../utils/env.js';
import { api } from './api.js';
import { normalizeHistoryList } from './normalizers.js';
import * as demo from './demo/demoBackend.js';

export async function listHistory(ticketId) {
  if (DEMO_MODE) {
    const data = await demo.listHistory(ticketId);
    return normalizeHistoryList(data);
  }

  const { data } = await api.get(`/tickets/${ticketId}/history/`);
  return normalizeHistoryList(data);
}
