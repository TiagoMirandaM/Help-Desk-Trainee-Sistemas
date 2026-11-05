import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Toaster } from '../components/feedback/Toaster.jsx';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    ({ type = 'info', title, message = '', duration = 5200 }) => {
      const id = nextId;
      nextId += 1;

      setToasts((current) => [...current.slice(-3), { id, type, title, message }]);

      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);

      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      notify,
      dismiss,
      success: (title, message) => notify({ type: 'success', title, message }),
      error: (title, message) => notify({ type: 'error', title, message }),
      info: (title, message) => notify({ type: 'info', title, message }),
      warning: (title, message) => notify({ type: 'warning', title, message }),
    }),
    [notify, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider.');
  }
  return context;
}
