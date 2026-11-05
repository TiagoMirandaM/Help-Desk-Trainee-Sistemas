import axios from 'axios';
import { API_BASE_URL } from '../utils/env.js';
import { emitUnauthorized } from './apiEvents.js';
import { ApiError, normalizeAxiosError } from './apiError.js';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();

  if (UNSAFE_METHODS.has(method)) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeAxiosError(error);
    const skipAuthEvent = error?.config?.skipAuthEvent;

    if (normalized.status === 401 && !skipAuthEvent) {
      emitUnauthorized();
    }

    return Promise.reject(normalized);
  },
);

export { ApiError };
