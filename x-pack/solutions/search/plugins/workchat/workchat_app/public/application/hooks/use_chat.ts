/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useWorkChatServices } from './use_workchat_service';

export const useChat = () => {
  const { chatService } = useWorkChatServices();

  const send = useCallback(
    async (message: string) => {
      const events$ = await chatService.callAgent();
      events$.subscribe((event) => {
        // TODO
      });
    },
    [chatService]
  );

  return {
    send,
  };
};
