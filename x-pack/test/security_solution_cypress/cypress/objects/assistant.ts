/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationCategory,
  ConversationCreateProps,
  ConversationResponse,
  Provider,
} from '@kbn/elastic-assistant-common';

export const getMockConversation = (body?: Partial<ConversationCreateProps>) => ({
  title: 'Test Conversation',
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: '',
    defaultSystemPromptId: 'default-system-prompt',
    model: 'test-model',
    provider: 'OpenAI' as Provider,
  },
  excludeFromLastConversationStorage: false,
  isDefault: false,
  messages: [],
  replacements: {},
  category: 'assistant' as ConversationCategory,
  ...body,
});

export const getMockConversationResponse = (
  body?: Partial<ConversationCreateProps>
): ConversationResponse => ({
  id: 'test-conversation-id',
  createdAt: '2023-10-31T00:00:00.000Z',
  users: [{ id: 'elastic', name: 'elastic@elastic.co' }],
  namespace: 'default',
  ...getMockConversation(body),
});
