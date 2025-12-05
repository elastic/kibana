/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationCreateProps } from '@kbn/elastic-assistant-common';

export const getSimpleConversation = (
  overrides?: Partial<ConversationCreateProps>
): ConversationCreateProps => {
  return {
    title: 'Getting Started with Elastic Security',
    category: 'assistant',
    messages: [
      {
        timestamp: '2025-08-26T14:33:23.125Z',
        role: 'user',
        content: 'hello there',
      },
      {
        timestamp: '2025-08-26T14:33:25.200Z',
        role: 'assistant',
        isError: false,
        traceData: {
          transactionId: '321321321',
          traceId: '123123123',
        },
        content: 'Hello! How can I assist you with Elastic Security today?',
      },
    ],
    apiConfig: {
      actionTypeId: '.gen-ai',
      connectorId: 'gpt-4-1',
    },
    ...overrides,
  };
};
