import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TicketComments } from './TicketComments.jsx';

const comments = [
  {
    id: 1,
    author: { id: 2, name: 'Carlos Lima' },
    content: 'Logs coletados e enviados para análise.',
    createdAt: '2026-10-20T14:30:00Z',
  },
];

describe('TicketComments', () => {
  it('lista comentários internos com autor, data e conteúdo', () => {
    render(<TicketComments comments={comments} onSubmit={vi.fn()} />);

    expect(screen.getByText('Comentários internos')).toBeInTheDocument();
    expect(screen.getByText('Carlos Lima')).toBeInTheDocument();
    expect(screen.getByText('Logs coletados e enviados para análise.')).toBeInTheDocument();
  });

  it('valida comentário vazio sem chamar o serviço', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TicketComments comments={[]} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /comentar/i }));

    expect(screen.getByText('Escreva um comentário antes de enviar.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envia e limpa o texto após sucesso', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<TicketComments comments={[]} onSubmit={onSubmit} />);

    const textarea = screen.getByLabelText(/novo comentário interno/i);
    await user.type(textarea, 'Equipamento reiniciado.');
    await user.click(screen.getByRole('button', { name: /comentar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Equipamento reiniciado.');
    });
    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });

  it('preserva o texto digitado quando o envio falha', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('falha'));

    render(<TicketComments comments={[]} onSubmit={onSubmit} />);

    const textarea = screen.getByLabelText(/novo comentário interno/i);
    await user.type(textarea, 'Teste de falha');
    await user.click(screen.getByRole('button', { name: /comentar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(textarea).toHaveValue('Teste de falha');
  });
});
