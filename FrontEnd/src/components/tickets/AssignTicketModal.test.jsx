import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AssignTicketModal } from './AssignTicketModal.jsx';

const ticket = {
  id: 9,
  code: 'HD-0009',
  title: 'Notebook sem acesso à rede',
  urgency: 'MEDIA',
};

function renderModal(overrides = {}) {
  const onClose = overrides.onClose ?? vi.fn();
  const onConfirm = overrides.onConfirm ?? vi.fn().mockResolvedValue(undefined);

  render(
    <AssignTicketModal
      open
      ticket={ticket}
      onClose={onClose}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );

  return { onClose, onConfirm };
}

describe('AssignTicketModal', () => {
  it('exibe código e título e envia a urgência selecionada', async () => {
    const user = userEvent.setup();
    const { onClose, onConfirm } = renderModal();

    expect(screen.getByRole('dialog', { name: /assumir chamado/i })).toBeInTheDocument();
    expect(screen.getByText('HD-0009')).toBeInTheDocument();
    expect(screen.getByText('Notebook sem acesso à rede')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Média' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Alta' }));
    await user.click(
      screen.getByRole('button', { name: /assumir e iniciar atendimento/i }),
    );

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('ALTA');
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('mantém o modal aberto e exibe o erro quando a assunção falha', async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error('conflito'), { status: 409 });
    const { onClose, onConfirm } = renderModal({
      onConfirm: vi.fn().mockRejectedValue(error),
    });

    await user.click(
      screen.getByRole('button', { name: /assumir e iniciar atendimento/i }),
    );

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.getByText(/alterado por outro usuário/i),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
