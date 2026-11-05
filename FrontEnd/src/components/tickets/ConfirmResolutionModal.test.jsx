import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmResolutionModal } from './ConfirmResolutionModal.jsx';

const ticket = {
  id: 12,
  code: 'HD-0012',
  title: 'Impressora sem conexão',
};

function renderModal(resolved, overrides = {}) {
  const onClose = overrides.onClose ?? vi.fn();
  const onConfirm = overrides.onConfirm ?? vi.fn().mockResolvedValue(undefined);

  render(
    <ConfirmResolutionModal
      open
      ticket={ticket}
      resolved={resolved}
      onClose={onClose}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );

  return { onClose, onConfirm };
}

describe('ConfirmResolutionModal', () => {
  it('confirma a resolução e encerra o modal', async () => {
    const user = userEvent.setup();
    const { onClose, onConfirm } = renderModal(true);

    expect(screen.getByText('HD-0012')).toBeInTheDocument();
    expect(screen.getByText(/não poderá ser desfeita/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /sim, confirmar resolução/i }),
    );

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(true);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('devolve o chamado ao atendimento quando o problema continua', async () => {
    const user = userEvent.setup();
    const { onClose, onConfirm } = renderModal(false);

    expect(screen.getByText(/voltará para o técnico responsável/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /não, devolver ao atendimento/i }),
    );

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(false);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('mantém o modal aberto quando a confirmação falha', async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error('conflito'), { status: 409 });
    const { onClose, onConfirm } = renderModal(true, {
      onConfirm: vi.fn().mockRejectedValue(error),
    });

    await user.click(
      screen.getByRole('button', { name: /sim, confirmar resolução/i }),
    );

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText(/alterado por outro usuário/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
