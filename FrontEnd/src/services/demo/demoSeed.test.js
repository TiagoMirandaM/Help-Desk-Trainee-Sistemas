import { beforeEach, describe, expect, it } from 'vitest';
import { TICKET_STATUS } from '../../utils/constants.js';
import { listTickets, resetDemoData } from './demoBackend.js';
import { createDemoSeed } from './demoSeed.js';

const DB_KEY = 'helpdesk.demo.db.v1';
const SESSION_KEY = 'helpdesk.demo.session.v1';

describe('seed de demonstração', () => {
  beforeEach(() => {
    resetDemoData();
    window.sessionStorage.clear();
  });

  it('mantém chamados abertos sem urgência', () => {
    const seed = createDemoSeed();
    const openTickets = seed.tickets.filter((ticket) => ticket.status === TICKET_STATUS.OPEN);

    expect(openTickets.length).toBeGreaterThan(0);
    expect(openTickets.every((ticket) => ticket.urgency === null)).toBe(true);
  });

  it('normaliza urgências antigas de chamados abertos ao carregar a base', async () => {
    const seed = createDemoSeed();
    const legacyOpenTicket = seed.tickets.find((ticket) => ticket.status === TICKET_STATUS.OPEN);
    legacyOpenTicket.urgency = 'ALTA';
    window.sessionStorage.setItem(DB_KEY, JSON.stringify(seed));
    window.sessionStorage.setItem(SESSION_KEY, '1');

    const response = await listTickets({ status: TICKET_STATUS.OPEN, page_size: 100 });

    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results.every((ticket) => ticket.urgency === null)).toBe(true);

    const stored = JSON.parse(window.sessionStorage.getItem(DB_KEY));
    const storedOpenTickets = stored.tickets.filter(
      (ticket) => ticket.status === TICKET_STATUS.OPEN,
    );
    expect(storedOpenTickets.every((ticket) => ticket.urgency === null)).toBe(true);
  });
});
