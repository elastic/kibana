/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationCategory,
  ConversationCreateProps,
  Provider,
} from '@kbn/elastic-assistant-common';
import type { PromptCreateProps } from '@kbn/elastic-assistant-common/impl/schemas';

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

export const getMockCreatePrompt = (body?: Partial<PromptCreateProps>): PromptCreateProps => ({
  name: 'Mock Prompt Name',
  promptType: 'quick',
  content: 'Mock Prompt Content',
  consumer: 'securitySolutionUI',
  ...body,
});
