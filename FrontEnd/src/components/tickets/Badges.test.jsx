import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TicketStatusBadge } from './TicketStatusBadge.jsx';
import { TicketUrgencyBadge } from './TicketUrgencyBadge.jsx';

describe('badges de chamado', () => {
  it('exibe o status por texto, não apenas por cor', () => {
    render(<TicketStatusBadge status="EM_ATENDIMENTO" />);
    expect(screen.getByText('Em atendimento')).toBeInTheDocument();
  });

  it('exibe a urgência por texto', () => {
    render(<TicketUrgencyBadge urgency="ALTA" />);
    expect(screen.getByText('Alta')).toBeInTheDocument();
  });

  it('indica que a urgência será definida na assunção', () => {
    render(<TicketUrgencyBadge urgency={null} />);
    expect(screen.getByText('A definir')).toBeInTheDocument();
  });

  it('faz fallback para o valor bruto quando o domínio é desconhecido', () => {
    render(<TicketStatusBadge status="CUSTOM" />);
    expect(screen.getByText('CUSTOM')).toBeInTheDocument();
  });
});
