/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The query param the chats page's detail panel opens on.
 *
 * A **query** param rather than a route param, so `/chats` keeps matching one route and the panel
 * composes with the params the page already carries — `?lifecycle=` in particular, which is how a
 * row opens the four-phase overlay over this same list.
 *
 * The panel's state lives in the URL for the three reasons the lifecycle overlay's does: another
 * page can open it by navigating (which is exactly what the queue row's agent button does), the
 * browser Back button closes it, and a thread worth talking about can be pasted into a chat.
 */
export const CONVERSATION_ID_QUERY_PARAM = 'conversationId';

/**
 * The conversation the detail panel is open on, or `undefined` when it is closed.
 *
 * A blank value reads as closed rather than as a conversation with an empty id: `?conversationId=`
 * is what a hand-edited URL leaves behind, and it must not open a panel with nothing in it. An id
 * that no conversation in the list matches is **not** filtered here — the page renders the plain
 * list for it, which is the graceful degradation the deep link needs.
 */
export const readConversationId = (search: string): string | undefined => {
  const value = new URLSearchParams(search).get(CONVERSATION_ID_QUERY_PARAM);

  return value != null && value !== '' ? value : undefined;
};

/** The search string that opens the panel, keeping whatever params the page already had. */
export const buildConversationSearch = (search: string, conversationId: string): string => {
  const params = new URLSearchParams(search);
  params.set(CONVERSATION_ID_QUERY_PARAM, conversationId);

  return `?${params.toString()}`;
};

/** The search string that closes the panel, keeping whatever params the page already had. */
export const clearConversationSearch = (search: string): string => {
  const params = new URLSearchParams(search);
  params.delete(CONVERSATION_ID_QUERY_PARAM);

  const remaining = params.toString();

  return remaining === '' ? '' : `?${remaining}`;
};
