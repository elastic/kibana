/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CHATS_PATH = '/chats';

/** Query parameter naming the chat to resume on the chats page. */
export const CHAT_ID_PARAM = 'chatId';

export const buildChatsPath = (chatId: string): string =>
  `${CHATS_PATH}?${CHAT_ID_PARAM}=${encodeURIComponent(chatId)}`;
