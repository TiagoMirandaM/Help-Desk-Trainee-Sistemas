export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * O modo de demonstração usa um backend simulado em memória.
 * Ele é sempre sinalizado na interface e nunca compartilha dados com a API real.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
