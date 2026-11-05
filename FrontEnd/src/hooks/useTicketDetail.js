import { useCallback, useEffect, useState } from 'react';
import * as ticketService from '../services/ticketService.js';
import * as commentService from '../services/commentService.js';
import * as historyService from '../services/historyService.js';

export function useTicketDetail(id, { includeInternal = false } = {}) {
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      ticketService.getTicket(id),
      includeInternal ? commentService.listComments(id) : Promise.resolve(null),
      includeInternal ? historyService.listHistory(id) : Promise.resolve(null),
    ])
      .then(([ticketData, commentsData, historyData]) => {
        if (!active) return;
        setTicket(ticketData);
        setComments(commentsData?.results || []);
        setHistory(historyData?.results || []);
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
  }, [id, includeInternal, reloadToken]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  const refreshInternalData = useCallback(async () => {
    if (!includeInternal) return;
    try {
      const [commentsData, historyData] = await Promise.all([
        commentService.listComments(id),
        historyService.listHistory(id),
      ]);
      setComments(commentsData.results);
      setHistory(historyData.results);
    } catch {
      // Os dados principais já foram atualizados; a seção interna pode ser recarregada.
    }
  }, [id, includeInternal]);

  const assign = useCallback(
    async (urgency) => {
      setPendingAction('assign');
      try {
        const updated = await ticketService.assignTicket(id, urgency);
        setTicket(updated);
        await refreshInternalData();
        return updated;
      } finally {
        setPendingAction(null);
      }
    },
    [id, refreshInternalData],
  );

  const transition = useCallback(
    async (status, actionKey = 'transition') => {
      setPendingAction(actionKey);
      try {
        const updated = await ticketService.transitionTicket(id, status);
        setTicket(updated);
        await refreshInternalData();
        return updated;
      } finally {
        setPendingAction(null);
      }
    },
    [id, refreshInternalData],
  );

  const resolve = useCallback(
    async (resolution) => {
      setPendingAction('resolve');
      try {
        const updated = await ticketService.resolveTicket(id, resolution);
        setTicket(updated);
        await refreshInternalData();
        return updated;
      } finally {
        setPendingAction(null);
      }
    },
    [id, refreshInternalData],
  );

  const confirmResolution = useCallback(
    async (resolved) => {
      setPendingAction('confirm');
      try {
        const updated = await ticketService.confirmResolution(id, resolved);
        setTicket(updated);
        await refreshInternalData();
        return updated;
      } finally {
        setPendingAction(null);
      }
    },
    [id, refreshInternalData],
  );

  const addComment = useCallback(
    async (content) => {
      setCommentSubmitting(true);
      try {
        const created = await commentService.createComment(id, content);
        setComments((current) => [...current, created]);
        return created;
      } finally {
        setCommentSubmitting(false);
      }
    },
    [id],
  );

  return {
    ticket,
    comments,
    history,
    loading,
    error,
    pendingAction,
    commentSubmitting,
    reload,
    assign,
    transition,
    resolve,
    confirmResolution,
    addComment,
  };
}
