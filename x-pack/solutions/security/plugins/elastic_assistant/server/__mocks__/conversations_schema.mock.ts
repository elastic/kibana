/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { estypes } from '@elastic/elasticsearch';
import type {
  AppendConversationMessageRequestBody,
  PerformBulkActionRequestBody,
  ConversationCreateProps,
  ConversationResponse,
  DeleteAllConversationsRequestBody,
  ConversationUpdateProps,
} from '@kbn/elastic-assistant-common';
import type {
  CreateMessageSchema,
  EsConversationSchema,
} from '../ai_assistant_data_clients/conversations/types';

export const getConversationSearchEsMock = () => {
  const searchResponse: estypes.SearchResponse<EsConversationSchema> = {
    took: 3,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: 0,
      hits: [
        {
          _index: 'foo',
          _id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          _source: {
            category: 'assistant',
            '@timestamp': '2019-12-13T16:40:33.400Z',
            created_at: '2019-12-13T16:40:33.400Z',
            updated_at: '2019-12-13T16:40:33.400Z',
            namespace: 'default',
            id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            title: 'test',
            exclude_from_last_conversation_storage: true,
            messages: [],
            replacements: [],
            users: [
              {
                name: 'elastic',
              },
            ],
            created_by: {
              name: 'elastic',
            },
          },
        },
      ],
    },
  };
  return searchResponse;
};

export const getCreateConversationSchemaMock = (
  rest?: Partial<ConversationCreateProps>
): ConversationCreateProps => ({
  title: 'Welcome',
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: '1',
    defaultSystemPromptId: 'Default',
    model: 'model',
  },
  excludeFromLastConversationStorage: false,
  messages: [
    {
      content: 'test content',
      role: 'user',
      timestamp: '2019-12-13T16:40:33.400Z',
      traceData: {
        traceId: '1',
        transactionId: '2',
      },
    },
  ],
  category: 'assistant',
  ...rest,
});

export const getDeleteAllConversationsSchemaMock = (): DeleteAllConversationsRequestBody => ({
  excludedIds: ['conversation-1'],
});

export const getUpdateConversationSchemaMock = (
  conversationId = 'conversation-1'
): ConversationUpdateProps => ({
  title: 'Welcome 2',
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: '2',
    defaultSystemPromptId: 'Default',
    model: 'model',
  },
  excludeFromLastConversationStorage: false,
  messages: [
    {
      content: 'test content',
      role: 'user',
      timestamp: '2019-12-13T16:40:33.400Z',
      traceData: {
        traceId: '1',
        transactionId: '2',
      },
    },
  ],
  id: conversationId,
});

export const getAppendConversationMessagesSchemaMock =
  (): AppendConversationMessageRequestBody => ({
    messages: [
      {
        content: 'test content',
        role: 'user',
        timestamp: '2019-12-13T16:40:33.400Z',
        traceData: {
          traceId: '1',
          transactionId: '2',
        },
      },
    ],
  });

export type ConversationMockParams = ConversationCreateProps | ConversationUpdateProps;

export const getConversationMock = (params: ConversationMockParams): ConversationResponse => ({
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: '1',
    defaultSystemPromptId: 'Default',
  },
  title: 'test',
  ...params,
  createdAt: '2019-12-13T16:40:33.400Z',
  updatedAt: '2019-12-13T16:40:33.400Z',
  namespace: 'default',
  category: 'assistant',
  users: [
    {
      name: 'elastic',
    },
  ],
  createdBy: {
    name: 'elastic',
  },
});

export const getQueryConversationParams = (isUpdate?: boolean): ConversationMockParams => {
  return isUpdate
    ? {
        title: 'Welcome 2',
        apiConfig: {
          actionTypeId: '.gen-ai',
          connectorId: '2',
          defaultSystemPromptId: 'Default',
          model: 'model',
        },
        category: 'assistant',
        excludeFromLastConversationStorage: false,
        messages: [
          {
            content: 'test content',
            role: 'user',
            timestamp: '2019-12-13T16:40:33.400Z',
            traceData: {
              traceId: '1',
              transactionId: '2',
            },
          },
        ],
        id: '1',
      }
    : {
        title: 'Welcome',
        category: 'assistant',
        apiConfig: {
          actionTypeId: '.gen-ai',
          connectorId: '1',
          defaultSystemPromptId: 'Default',
          model: 'model',
        },
        excludeFromLastConversationStorage: false,
        messages: [
          {
            content: 'test content',
            role: 'user',
            timestamp: '2019-12-13T16:40:33.400Z',
            traceData: {
              traceId: '1',
              transactionId: '2',
            },
          },
        ],
      };
};

export const getPerformBulkActionSchemaMock = (): PerformBulkActionRequestBody => ({
  create: [getQueryConversationParams(false) as ConversationCreateProps],
  delete: {
    ids: ['99403909-ca9b-49ba-9d7a-7e5320e68d05'],
  },
  update: [getQueryConversationParams(true) as ConversationUpdateProps],
});

export const getEsCreateConversationSchemaMock = (
  rest?: Partial<CreateMessageSchema>
): CreateMessageSchema => ({
  title: 'Welcome',
  api_config: {
    action_type_id: '.gen-ai',
    connector_id: '1',
    default_system_prompt_id: 'Default',
    model: 'model',
  },
  '@timestamp': '2019-12-13T16:40:33.400Z',
  created_at: '2019-12-13T16:40:33.400Z',
  updated_at: '2019-12-13T16:40:33.400Z',
  exclude_from_last_conversation_storage: false,
  messages: [
    {
      id: uuidv4(),
      content: 'test content',
      role: 'user',
      '@timestamp': '2019-12-13T16:40:33.400Z',
      trace_data: {
        trace_id: '1',
        transaction_id: '2',
      },
    },
  ],
  category: 'assistant',
  users: [{ name: 'elastic' }],
  created_by: { name: 'elastic' },
  namespace: 'default',
  ...rest,
});

export const getEsConversationSchemaMock = (
  rest?: Partial<EsConversationSchema>
): EsConversationSchema => ({
  '@timestamp': '2020-04-20T15:25:31.830Z',
  created_at: '2020-04-20T15:25:31.830Z',
  title: 'title-1',
  updated_at: '2020-04-20T15:25:31.830Z',
  messages: [],
  id: '1',
  namespace: 'default',
  exclude_from_last_conversation_storage: false,
  api_config: {
    action_type_id: '.gen-ai',
    connector_id: 'c1',
    default_system_prompt_id: 'prompt-1',
    model: 'test',
    provider: 'Azure OpenAI',
  },
  category: 'assistant',
  users: [
    {
      id: '1111',
      name: 'elastic',
    },
  ],
  created_by: {
    id: '1111',
    name: 'elastic',
  },
  replacements: undefined,
  ...rest,
});
