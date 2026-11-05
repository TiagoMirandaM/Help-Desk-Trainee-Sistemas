import { useCallback, useEffect, useState } from 'react';
import { listCategories } from '../services/categoryService.js';

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listCategories()
      .then((data) => {
        if (!active) return;
        setCategories(data);
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
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  return { categories, loading, error, reload };
}
