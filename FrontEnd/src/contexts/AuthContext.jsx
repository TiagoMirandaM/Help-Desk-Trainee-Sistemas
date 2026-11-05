import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authService from '../services/authService.js';
import { onUnauthorized } from '../services/apiEvents.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    let active = true;

    authService
      .getCurrentUser({ silent: true })
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('anonymous');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return onUnauthorized(() => {
      setUser(null);
      setStatus('anonymous');
      setSessionExpired(true);
    });
  }, []);

  const login = useCallback(async (credentials) => {
    const authenticatedUser = await authService.login(credentials);
    setUser(authenticatedUser);
    setStatus('authenticated');
    setSessionExpired(false);
    return authenticatedUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Mesmo que o backend esteja indisponível, a sessão local é encerrada.
    } finally {
      setUser(null);
      setStatus('anonymous');
      setSessionExpired(false);
    }
  }, []);

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  const value = useMemo(
    () => ({
      user,
      status,
      isLoading: status === 'loading',
      isAuthenticated: Boolean(user),
      sessionExpired,
      login,
      logout,
      clearSessionExpired,
    }),
    [user, status, sessionExpired, login, logout, clearSessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return context;
}
