/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

export const SELECTED_CONVERSATION_ID_PARAM = 'selectedConversationId';

export interface ConversationsUrlParams {
  /** Conversation whose details flyout is open, from the URL. */
  selectedConversationId?: string;
  selectConversation: (id: string) => void;
  /** Closes the flyout, leaving a history entry so Back reopens it. */
  clearSelectedConversation: () => void;
}

/**
 * Keeps the details flyout in the URL so it survives a reload and a shared link.
 *
 * The URL is the only source of truth for which flyout is open: opening one is a navigation, and
 * the flyout itself is opened by an effect watching this value, so a click and a cold landing on
 * the same link take the identical path.
 *
 * Opening and closing push, so Back closes the flyout. The flyout's own tab state belongs to Agent
 * Builder and is deliberately not mirrored here.
 */
export const useConversationsUrlParams = (): ConversationsUrlParams => {
  const history = useHistory();
  const { pathname, search } = useLocation();

  const selectedConversationId = useMemo(
    () => new URLSearchParams(search).get(SELECTED_CONVERSATION_ID_PARAM) ?? undefined,
    [search]
  );

  const navigate = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(search);
      mutate(params);

      const nextSearch = params.toString();
      history.push({ pathname, search: nextSearch ? `?${nextSearch}` : '' });
    },
    [history, pathname, search]
  );

  const selectConversation = useCallback(
    (id: string) => navigate((params) => params.set(SELECTED_CONVERSATION_ID_PARAM, id)),
    [navigate]
  );

  const clearSelectedConversation = useCallback(
    () => navigate((params) => params.delete(SELECTED_CONVERSATION_ID_PARAM)),
    [navigate]
  );

  return {
    selectedConversationId,
    selectConversation,
    clearSelectedConversation,
  };
};
