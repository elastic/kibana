/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  UpdateConversationSchema,
  transformToUpdateScheme,
  updateConversation,
} from './update_conversation';
import { getConversation } from './get_conversation';
import { authenticatedUser } from '../../__mocks__/user';
import { ConversationResponse, ConversationUpdateProps } from '@kbn/elastic-assistant-common';

export const getUpdateConversationOptionsMock = (): ConversationUpdateProps => ({
  id: 'test',
  title: 'test',
  apiConfig: {
    connectorId: '1',
    actionTypeId: '.gen-ai',
    defaultSystemPromptId: 'default-system-prompt',
    model: 'test-model',
    provider: 'OpenAI',
  },
  excludeFromLastConversationStorage: false,
  messages: [],
  replacements: {},
});

const mockUser1 = authenticatedUser;

export const getConversationResponseMock = (): ConversationResponse => ({
  id: 'test',
  title: 'test',
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: '1',
    defaultSystemPromptId: 'default-system-prompt',
    model: 'test-model',
    provider: 'OpenAI',
  },
  category: 'assistant',
  excludeFromLastConversationStorage: false,
  messages: [
    {
      content: 'Message 3',
      role: 'user',
      timestamp: '2024-02-14T22:29:43.862Z',
    },
    {
      content: 'Message 4',
      role: 'user',
      timestamp: '2024-02-14T22:29:43.862Z',
    },
  ],
  replacements: {},
  createdAt: '2020-04-20T15:25:31.830Z',
  namespace: 'default',
  isDefault: false,
  updatedAt: '2020-04-20T15:25:31.830Z',
  timestamp: '2020-04-20T15:25:31.830Z',
  users: [
    {
      id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      name: 'elastic',
    },
  ],
});

jest.mock('./get_conversation', () => ({
  getConversation: jest.fn(),
}));

describe('updateConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a conversation with serializer and deserializer', async () => {
    const conversation: ConversationUpdateProps = getUpdateConversationOptionsMock();
    const existingConversation = getConversationResponseMock();
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(existingConversation);

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.updateByQuery.mockResolvedValue({ updated: 1 });

    const updatedList = await updateConversation({
      esClient,
      logger: loggerMock.create(),
      conversationIndex: 'index-1',
      conversationUpdateProps: conversation,
      user: mockUser1,
    });
    const expected: ConversationResponse = {
      ...getConversationResponseMock(),
      id: conversation.id,
      title: 'test',
    };
    expect(updatedList).toEqual(expected);
  });

  test('it returns null when there is not a conversation to update', async () => {
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(null);
    const conversation = getUpdateConversationOptionsMock();

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    const updatedList = await updateConversation({
      esClient,
      logger: loggerMock.create(),
      conversationIndex: 'index-1',
      conversationUpdateProps: conversation,
      user: mockUser1,
    });
    expect(updatedList).toEqual(null);
  });
});

describe('transformToUpdateScheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a transformed conversation with converted string datetime to ISO from the client', async () => {
    const conversation: ConversationUpdateProps = getUpdateConversationOptionsMock();
    const existingConversation = getConversationResponseMock();
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(existingConversation);

    const updateAt = new Date().toISOString();
    const transformed = transformToUpdateScheme(updateAt, {
      ...conversation,
      messages: [
        {
          content: 'Message 3',
          role: 'user',
          timestamp: '2011-10-05T14:48:00.000Z',
          traceData: {
            traceId: 'something',
            transactionId: 'something',
          },
          metadata: {
            contentReferences: {
              zm3i5: {
                knowledgeBaseEntryName: 'Favorite_Food',
                knowledgeBaseEntryId: '1c53565d-c6f1-45ab-9f4b-80b604dba8f3',
                id: 'zm3i5',
                type: 'KnowledgeBaseEntry',
              },
            },
          },
        },
        {
          content: 'Message 4',
          role: 'user',
          timestamp: '2011-10-06T14:48:00.000Z',
        },
      ],
    });
    const expected: UpdateConversationSchema = {
      id: conversation.id,
      title: 'test',
      api_config: {
        action_type_id: '.gen-ai',
        connector_id: '1',
        default_system_prompt_id: 'default-system-prompt',
        model: 'test-model',
        provider: 'OpenAI',
      },
      exclude_from_last_conversation_storage: false,
      replacements: [],
      updated_at: updateAt,
      messages: [
        {
          '@timestamp': '2011-10-05T14:48:00.000Z',
          content: 'Message 3',
          is_error: undefined,
          reader: undefined,
          role: 'user',
          trace_data: {
            trace_id: 'something',
            transaction_id: 'something',
          },
          metadata: {
            content_references: {
              zm3i5: {
                knowledgeBaseEntryName: 'Favorite_Food',
                knowledgeBaseEntryId: '1c53565d-c6f1-45ab-9f4b-80b604dba8f3',
                id: 'zm3i5',
                type: 'KnowledgeBaseEntry',
              },
            },
          },
        },
        {
          '@timestamp': '2011-10-06T14:48:00.000Z',
          content: 'Message 4',
          is_error: undefined,
          reader: undefined,
          role: 'user',
        },
      ],
    };
    expect(transformed).toEqual(expected);
  });
  test('it does not pass api_config if apiConfig is not updated', async () => {
    const conversation: ConversationUpdateProps = getUpdateConversationOptionsMock();
    const existingConversation = getConversationResponseMock();
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(existingConversation);

    const updateAt = new Date().toISOString();
    const transformed = transformToUpdateScheme(updateAt, {
      id: conversation.id,
      messages: [
        {
          content: 'Message 3',
          role: 'user',
          timestamp: '2011-10-05T14:48:00.000Z',
          traceData: {
            traceId: 'something',
            transactionId: 'something',
          },
        },
      ],
    });
    const expected: UpdateConversationSchema = {
      id: conversation.id,
      updated_at: updateAt,
      messages: [
        {
          '@timestamp': '2011-10-05T14:48:00.000Z',
          content: 'Message 3',
          is_error: undefined,
          reader: undefined,
          role: 'user',
          trace_data: {
            trace_id: 'something',
            transaction_id: 'something',
          },
        },
      ],
    };
    expect(transformed).toEqual(expected);
  });
});
