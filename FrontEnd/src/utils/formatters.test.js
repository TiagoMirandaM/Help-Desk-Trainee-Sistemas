import { describe, expect, it } from 'vitest';
import {
  formatCategory,
  formatRole,
  formatStatus,
  formatTicketCode,
  formatUrgency,
  getInitials,
  getUserName,
} from './formatters.js';

describe('formatters', () => {
  it('usa o código do chamado quando disponível e o id como fallback', () => {
    expect(formatTicketCode({ code: 'HD-0101', id: 101 })).toBe('HD-0101');
    expect(formatTicketCode({ id: 7 })).toBe('#0007');
    expect(formatTicketCode({ id: 'abc' })).toBe('abc');
    expect(formatTicketCode(null)).toBe('—');
  });

  it('traduz status, urgência, perfil e categoria', () => {
    expect(formatStatus('EM_ATENDIMENTO')).toBe('Em atendimento');
    expect(formatUrgency('MEDIA')).toBe('Média');
    expect(formatRole('TECNICO')).toBe('Técnico');
    expect(formatCategory({ name: 'Infraestrutura' })).toBe('Infraestrutura');
    expect(formatCategory('TI')).toBe('TI');
    expect(formatCategory(null)).toBe('—');
  });

  it('monta o nome e as iniciais do usuário', () => {
    expect(getUserName({ name: 'Ana Souza' })).toBe('Ana Souza');
    expect(getUserName({ first_name: 'João', last_name: 'Pereira' })).toBe('João Pereira');
    expect(getUserName({ username: 'carlos.lima' })).toBe('carlos.lima');
    expect(getInitials({ name: 'Marina Alves' })).toBe('MA');
    expect(getInitials(null)).toBe('?');
  });
});
