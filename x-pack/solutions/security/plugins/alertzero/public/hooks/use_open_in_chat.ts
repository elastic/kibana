/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { CHATS_PATH, buildChatsPath } from '../pages/chats/path';

/**
 * Opens an investigation's chat on the AlertZero chats page.
 *
 * Lives here rather than in `@kbn/agentic-investigations-common` because the route belongs to this
 * solution, and that package is shared across solutions.
 *
 * Navigates through the app's own history rather than `navigateToApp`, so Back returns to the
 * queue with its URL intact and reopens whichever flyout was showing.
 */
export const useOpenInChat = (): ((chatId?: string) => void) => {
  const history = useHistory();

  return useCallback(
    (chatId?: string) => {
      history.push(chatId ? buildChatsPath(chatId) : CHATS_PATH);
    },
    [history]
  );
};
