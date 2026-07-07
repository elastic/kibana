/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ConversationUpdateProps } from '@kbn/elastic-assistant-common';

import type { UpdateConversationSchema } from './update_conversation';
import { transformToUpdateScheme, updateConversation } from './update_conversation';
import type { EsConversationSchema } from './types';
import { authenticatedUser } from '../../__mocks__/user';
import type { DocumentsDataWriter } from '../../lib/data_stream/documents_data_writer';

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
const userAsUser = {
  id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
  name: 'elastic',
};
const getEsConversationMock = (): EsConversationSchema => {
  return {
    '@timestamp': '2025-08-19T10:49:52.884Z',
    updated_at: '2025-08-19T13:26:01.746Z',
    api_config: {
      action_type_id: '.gen-ai',
      connector_id: 'gpt-4-1',
    },
    namespace: 'default',
    created_at: '2025-08-19T10:49:52.884Z',
    created_by: userAsUser,
    messages: [
      {
        '@timestamp': '2025-08-19T10:49:53.799Z',
        role: 'user',
        content: 'Hello there, how many opened alerts do I have?',
        user: userAsUser,
      },
      {
        metadata: {
          content_references: {
            oQ5xL: {
              id: 'oQ5xL',
              type: 'SecurityAlertsPage',
            },
          },
        },
        '@timestamp': '2025-08-19T10:49:57.398Z',
        role: 'assistant',
        is_error: false,
        trace_data: {
          transaction_id: 'ee432e8be6ad3f9c',
          trace_id: 'f44d01b6095d35dce15aa8137df76e29',
        },
        content: 'You currently have 61 open alerts in your environment. {reference(oQ5xL)}',
      },
    ],
    replacements: [],
    title: 'Viewing the Number of Open Alerts in Elastic Security',
    category: 'assistant',
    users: [userAsUser],
    id: 'a565baa8-5566-47b2-ab69-807248b2fc46',
  };
};

const getNothingToUpdateErrorResponseMock = () => {
  return {
    errors: [
      {
        status_code: 500,
        conversations: [{ id: '', name: '' }],
        message:
          'null_pointer_exception\n\tRoot causes:\n\t\tnull_pointer_exception: Cannot invoke "org.elasticsearch.xcontent.XContentType.xContent()" because "xContentType" is null',
      },
    ],
    docs_updated: [],
  };
};

const dataWriterMock = {
  bulk: jest.fn(),
} as unknown as DocumentsDataWriter;

describe('updateConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it calls a `dataWriter.bulk` with the correct parameters', async () => {
    const conversation: ConversationUpdateProps = getUpdateConversationOptionsMock();
    const updatedESConversation = getEsConversationMock();

    (dataWriterMock.bulk as jest.Mock).mockResolvedValue({
      errors: [],
      docs_updated: [updatedESConversation],
    });

    await updateConversation({
      conversationUpdateProps: conversation,
      dataWriter: dataWriterMock,
      logger: loggerMock.create(),
      user: mockUser1,
    });

    expect(dataWriterMock.bulk).toHaveBeenCalledWith({
      documentsToUpdate: [
        {
          api_config: {
            action_type_id: '.gen-ai',
            connector_id: '1',
            default_system_prompt_id: 'default-system-prompt',
            model: 'test-model',
            provider: 'OpenAI',
          },
          exclude_from_last_conversation_storage: false,
          id: 'test',
          messages: [],
          replacements: [],
          title: 'test',
          updated_at: expect.anything(),
        },
      ],
      getUpdateScript: expect.anything(),
      authenticatedUser: mockUser1,
    });
  });

  test('it returns a conversation with serializer and deserializer', async () => {
    const conversation: ConversationUpdateProps = getUpdateConversationOptionsMock();
    const updatedESConversation = getEsConversationMock();

    (dataWriterMock.bulk as jest.Mock).mockResolvedValue({
      errors: [],
      docs_updated: [updatedESConversation],
    });

    const updatedList = await updateConversation({
      conversationUpdateProps: conversation,
      dataWriter: dataWriterMock,
      logger: loggerMock.create(),
      user: mockUser1,
    });

    expect(updatedList).toEqual({
      timestamp: '2025-08-19T10:49:52.884Z',
      createdAt: '2025-08-19T10:49:52.884Z',
      users: [userAsUser],
      title: 'Viewing the Number of Open Alerts in Elastic Security',
      category: 'assistant',
      apiConfig: {
        actionTypeId: '.gen-ai',
        connectorId: 'gpt-4-1',
      },
      messages: [
        {
          timestamp: '2025-08-19T10:49:53.799Z',
          content: 'Hello there, how many opened alerts do I have?',
          role: 'user',
          user: userAsUser,
        },
        {
          timestamp: '2025-08-19T10:49:57.398Z',
          content: 'You currently have 61 open alerts in your environment. {reference(oQ5xL)}',
          role: 'assistant',
          metadata: {
            contentReferences: {
              oQ5xL: {
                id: 'oQ5xL',
                type: 'SecurityAlertsPage',
              },
            },
          },
          traceData: {
            traceId: 'f44d01b6095d35dce15aa8137df76e29',
            transactionId: 'ee432e8be6ad3f9c',
          },
        },
      ],
      updatedAt: '2025-08-19T13:26:01.746Z',
      replacements: {},
      namespace: 'default',
      id: 'a565baa8-5566-47b2-ab69-807248b2fc46',
      createdBy: userAsUser,
    });
  });

  test('it returns null when there is not a conversation to update', async () => {
    const conversation = getUpdateConversationOptionsMock();
    (dataWriterMock.bulk as jest.Mock).mockResolvedValue(getNothingToUpdateErrorResponseMock());

    const mockedLogger = loggerMock.create();
    const updatedList = await updateConversation({
      conversationUpdateProps: conversation,
      dataWriter: dataWriterMock,
      logger: mockedLogger,
      user: mockUser1,
    });
    expect(updatedList).toEqual(null);
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error updating conversation: null_pointer_exception')
    );
  });
});

describe('transformToUpdateScheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a transformed conversation with converted string datetime to ISO from the client', async () => {
    const conversation: ConversationUpdateProps = getUpdateConversationOptionsMock();

    const updateAt = new Date().toISOString();
    const transformed = transformToUpdateScheme(updateAt, {
      ...conversation,
      messages: [
        {
          id: 'message-1',
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
          id: 'message-2',
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
          id: 'message-1',
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
          id: 'message-2',
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

    const updateAt = new Date().toISOString();
    const transformed = transformToUpdateScheme(updateAt, {
      id: conversation.id,
      messages: [
        {
          id: 'message-3',
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
          id: 'message-3',
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
