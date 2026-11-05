import { useCallback, useEffect, useState } from 'react';
import { listTickets } from '../services/ticketService.js';

const EMPTY_DATA = {
  count: 0,
  results: [],
  hasNext: false,
  hasPrevious: false,
};

/**
 * Consulta paginada de chamados. Os filtros são serializados para evitar
 * requisições repetidas quando o objeto é recriado a cada renderização.
 */
export function useTickets(filters = {}, { enabled = true } = {}) {
  const filtersKey = JSON.stringify(filters);
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const params = JSON.parse(filtersKey);

    listTickets(params)
      .then((response) => {
        if (!active) return;
        setData(response);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filtersKey, reloadToken, enabled]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  return {
    tickets: data.results,
    count: data.count,
    hasNext: data.hasNext,
    hasPrevious: data.hasPrevious,
    loading,
    error,
    reload,
  };
}
