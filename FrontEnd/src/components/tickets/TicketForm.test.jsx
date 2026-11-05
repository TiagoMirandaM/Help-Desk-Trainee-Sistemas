import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TicketForm } from './TicketForm.jsx';

const categories = [
  { id: 1, name: 'TI', slug: 'ti' },
  { id: 2, name: 'Infraestrutura', slug: 'infraestrutura' },
  { id: 3, name: 'Financeiro', slug: 'financeiro' },
];

describe('TicketForm', () => {
  it('bloqueia o envio e exibe validações quando campos obrigatórios estão vazios', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TicketForm categories={categories} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /abrir chamado/i }));

    expect(await screen.findByText('Informe um título para o chamado.')).toBeInTheDocument();
    expect(screen.getByText('Selecione uma categoria.')).toBeInTheDocument();
    expect(screen.getByText('Descreva o problema do chamado.')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Média' })).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envia os dados válidos e atualiza o contador de caracteres', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<TicketForm categories={categories} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/título/i), 'Erro ao acessar o ERP');
    await user.selectOptions(screen.getByLabelText(/categoria/i), '1');

    const description = screen.getByLabelText(/descrição detalhada/i);
    await user.type(
      description,
      'Ao tentar entrar no ERP o sistema retorna erro de credenciais inválidas.',
    );

    expect(
      screen.getByText(
        (content, element) =>
          element?.tagName === 'SPAN' && element.textContent === '72/2000',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir chamado/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        title: 'Erro ao acessar o ERP',
        category: '1',
      }),
    );
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('urgency');
  });
});
