import { DEMO_MODE } from '../utils/env.js';
import { api } from './api.js';
import { normalizeUser } from './normalizers.js';
import * as demo from './demo/demoBackend.js';

async function ensureCsrfCookie() {
  if (DEMO_MODE) return;
  try {
    await api.get('/auth/csrf/');
  } catch {
    // O backend pode definir o cookie CSRF em outra requisição; o login decide se falha.
  }
}

export async function login(credentials) {
  if (DEMO_MODE) {
    const data = await demo.login(credentials);
    return normalizeUser(data?.user || data);
  }

  await ensureCsrfCookie();
  const { data } = await api.post('/auth/login/', credentials, { skipAuthEvent: true });
  const rawUser = data?.user || data?.profile || (data?.id ? data : null);

  if (rawUser) return normalizeUser(rawUser);
  return getCurrentUser({ silent: true });
}

export async function getCurrentUser({ silent = false } = {}) {
  if (DEMO_MODE) {
    const data = await demo.me();
    return normalizeUser(data?.user || data);
  }

  const { data } = await api.get('/auth/me/', { skipAuthEvent: silent });
  return normalizeUser(data?.user || data);
}

export async function logout() {
  if (DEMO_MODE) {
    await demo.logout();
    return;
  }

  await api.post('/auth/logout/');
}
