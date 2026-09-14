/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { ApplicationStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALERTZERO_APP_ID } from '@kbn/alertzero-common';
import { CHATS_PATH, buildChatsPath } from '../pages/chats/path';

/**
 * Opens an investigation's chat on the AlertZero chats page.
 *
 * Lives here rather than in `@kbn/agentic-investigations-common` because the route belongs to this
 * solution, and that package is shared across solutions.
 */
export const useOpenInChat = (): ((chatId?: string) => void) => {
  const { services } = useKibana<{ application: ApplicationStart }>();
  const { application } = services;

  return useCallback(
    (chatId?: string) => {
      application.navigateToApp(ALERTZERO_APP_ID, {
        path: chatId ? buildChatsPath(chatId) : CHATS_PATH,
      });
    },
    [application]
  );
};
