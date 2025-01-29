/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAIAssistChat } from './use_ai_assist_chat';
import { useKibana } from './use_kibana';
import { APIRoutes, UseChatHelpers } from '../types';

export const useChat = (): UseChatHelpers => {
  const { services } = useKibana();

  const chatHelpers = useAIAssistChat({
    api: async (request: RequestInit) => {
      const response = await services.http.post(APIRoutes.POST_CHAT_MESSAGE, {
        ...request,
        rawResponse: true,
        asResponse: true,
      });

      return response.response!;
    },
  });

  return chatHelpers;
};
