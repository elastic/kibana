/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { ConversationResponse, Message } from '@kbn/elastic-assistant-common';
import type {
  DocumentsDataWriter,
  WriterBulkResponse,
} from '../../lib/data_stream/documents_data_writer';
import {
  appendConversationMessages,
  transformToUpdateScheme,
} from './append_conversation_messages';
import type { EsConversationSchema } from './types';
import { authenticatedUser } from '../../__mocks__/user';
import {
  getConversationMock,
  getAppendConversationMessagesSchemaMock,
  getQueryConversationParams,
  getEsConversationSchemaMock,
} from '../../__mocks__/conversations_schema.mock';
import { transformESToConversations } from './transforms';
import { getUpdateScript } from './helpers';

jest.mock('./transforms', () => ({
  transformESToConversations: jest.fn(),
}));

jest.mock('./helpers', () => ({
  getUpdateScript: jest.fn(),
}));

const mockUser = authenticatedUser;

// Reusable mock helpers to keep tests DRY
const createMockDataWriter = (): jest.Mocked<DocumentsDataWriter> =>
  ({
    bulk: jest.fn(),
    getFilterByUser: jest.fn(),
    getFilterByConversationUser: jest.fn(),
  } as unknown as jest.Mocked<DocumentsDataWriter>);
// Use existing mocks to keep tests DRY
const createMockConversation = (
  overrides?: Partial<ConversationResponse>
): ConversationResponse => {
  const baseParams = getQueryConversationParams(false);
  return getConversationMock({
    ...baseParams,
    ...overrides,
  });
};

const createMockMessage = (overrides?: Partial<Message>): Message => {
  const baseMessage = getAppendConversationMessagesSchemaMock().messages[0];
  return {
    ...baseMessage,
    id: 'msg-2',
    user: { id: 'my_profile_uid', name: 'elastic' },
    ...overrides,
  };
};

// Use shared mock from conversations_schema.mock.ts
const createMockEsConversation = (): EsConversationSchema => getEsConversationSchemaMock();

const createSuccessfulBulkResponse = (
  docsUpdated: EsConversationSchema[]
): WriterBulkResponse<EsConversationSchema> => ({
  errors: [],
  docs_created: [],
  docs_deleted: [],
  docs_updated: docsUpdated,
  took: 10,
});

const createErrorBulkResponse = (): WriterBulkResponse<EsConversationSchema> => ({
  errors: [
    {
      message: 'Document update failed',
      document: { id: '1' },
    },
  ],
  docs_created: [],
  docs_deleted: [],
  docs_updated: [],
  took: 5,
});

describe('appendConversationMessages', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let dataWriter: jest.Mocked<DocumentsDataWriter>;
  let existingConversation: ConversationResponse;
  let newMessages: Message[];

  // Test helper functions to reduce repetition
  const setupSuccessfulTest = () => {
    const mockEsConversation = createMockEsConversation();
    const bulkResponse = createSuccessfulBulkResponse([mockEsConversation]);
    const expectedConversation = createMockConversation();

    dataWriter.bulk.mockResolvedValue(bulkResponse);
    (transformESToConversations as jest.Mock).mockReturnValue([expectedConversation]);

    return { mockEsConversation, bulkResponse, expectedConversation };
  };

  const callAppendConversationMessages = async (messages: Message[] = newMessages) => {
    return appendConversationMessages({
      dataWriter,
      logger,
      existingConversation,
      messages,
      authenticatedUser: mockUser,
    });
  };

  const expectBulkCallWithMessages = (expectedMessages: Message[]) => {
    expect(dataWriter.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        documentsToUpdate: expect.arrayContaining([
          expect.objectContaining({
            id: existingConversation.id,
            updated_at: '2024-01-01T01:00:00.000Z',
            messages: expect.arrayContaining(
              expectedMessages.map((msg) =>
                expect.objectContaining({
                  content: msg.content,
                  role: msg.role,
                  '@timestamp': msg.timestamp,
                })
              )
            ),
          }),
        ]),
        getUpdateScript: expect.any(Function),
        authenticatedUser: mockUser,
      })
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    dataWriter = createMockDataWriter();
    existingConversation = createMockConversation();
    newMessages = [createMockMessage()];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T01:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns updated conversation when bulk operation succeeds', async () => {
    setupSuccessfulTest();
    const expectedResult = createMockConversation({
      messages: [...existingConversation.messages!, ...newMessages],
      updatedAt: '2024-01-01T01:00:00.000Z',
    });
    (transformESToConversations as jest.Mock).mockReturnValue([expectedResult]);

    const result = await callAppendConversationMessages();

    expect(result).toEqual(expectedResult);
  });

  it('calls dataWriter.bulk with correct parameters', async () => {
    setupSuccessfulTest();
    (getUpdateScript as jest.Mock).mockReturnValue({ script: { source: 'test' } });

    await callAppendConversationMessages();

    expectBulkCallWithMessages([...existingConversation.messages!, ...newMessages]);
  });

  it('returns null when bulk operation has errors', async () => {
    dataWriter.bulk.mockResolvedValue(createErrorBulkResponse());

    const result = await callAppendConversationMessages();

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      'Error appending conversation messages: Document update failed for conversation by ID: 04128c15-0d1b-4716-a4c5-46997ac7f3bd'
    );
  });

  it('handles empty messages array', async () => {
    const { expectedConversation } = setupSuccessfulTest();

    const result = await callAppendConversationMessages([]);

    expect(result).toEqual(expectedConversation);
    expectBulkCallWithMessages(existingConversation.messages!);
  });

  it('handles conversation without existing messages', async () => {
    const conversationWithoutMessages = createMockConversation({ messages: undefined });
    const { expectedConversation } = setupSuccessfulTest();

    const result = await appendConversationMessages({
      dataWriter,
      logger,
      existingConversation: conversationWithoutMessages,
      messages: newMessages,
      authenticatedUser: mockUser,
    });

    expect(result).toEqual(expectedConversation);
    expectBulkCallWithMessages(newMessages);
  });

  it('preserves all existing conversation fields in transformation', async () => {
    const conversationWithAllFields = createMockConversation({
      title: 'Complex Conversation',
      apiConfig: {
        actionTypeId: '.custom-ai',
        connectorId: 'custom-connector',
        defaultSystemPromptId: 'custom-prompt',
        model: 'custom-model',
        provider: 'OpenAI',
      },
      excludeFromLastConversationStorage: true,
      replacements: {
        key1: 'value1',
        key2: 'value2',
      },
    });

    const mockEsConversation = createMockEsConversation();
    const bulkResponse = createSuccessfulBulkResponse([mockEsConversation]);
    const expectedConversation = createMockConversation();

    dataWriter.bulk.mockResolvedValue(bulkResponse);
    (transformESToConversations as jest.Mock).mockReturnValue([expectedConversation]);

    await appendConversationMessages({
      dataWriter,
      logger,
      existingConversation: conversationWithAllFields,
      messages: newMessages,
      authenticatedUser: mockUser,
    });

    expect(dataWriter.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        documentsToUpdate: expect.arrayContaining([
          expect.objectContaining({
            title: 'Complex Conversation',
            api_config: {
              action_type_id: '.custom-ai',
              connector_id: 'custom-connector',
              default_system_prompt_id: 'custom-prompt',
              model: 'custom-model',
              provider: 'OpenAI',
            },
            exclude_from_last_conversation_storage: true,
            replacements: [
              { uuid: 'key1', value: 'value1' },
              { uuid: 'key2', value: 'value2' },
            ],
          }),
        ]),
      })
    );
  });

  it('handles message with metadata and trace data', async () => {
    const messageWithMetadata = createMockMessage({
      metadata: {
        contentReferences: {
          'ref-1': {
            id: 'ref-1',
            type: 'KnowledgeBaseEntry',
            knowledgeBaseEntryId: 'kb-1',
            knowledgeBaseEntryName: 'Reference 1',
          },
        },
      },
      traceData: {
        traceId: 'trace-123',
        transactionId: 'transaction-456',
      },
    });

    setupSuccessfulTest();

    await callAppendConversationMessages([messageWithMetadata]);

    expect(dataWriter.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        documentsToUpdate: expect.arrayContaining([
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                metadata: {
                  content_references: {
                    'ref-1': {
                      id: 'ref-1',
                      type: 'KnowledgeBaseEntry',
                      knowledgeBaseEntryId: 'kb-1',
                      knowledgeBaseEntryName: 'Reference 1',
                    },
                  },
                },
                trace_data: {
                  trace_id: 'trace-123',
                  transaction_id: 'transaction-456',
                },
              }),
            ]),
          }),
        ]),
      })
    );
  });

  it('preserves refusal reason when present on messages', async () => {
    const messageWithRefusal = createMockMessage({
      refusal: 'Detected harmful input content: INSULTS',
    });
    setupSuccessfulTest();

    await callAppendConversationMessages([messageWithRefusal]);

    expect(dataWriter.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        documentsToUpdate: expect.arrayContaining([
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                refusal: 'Detected harmful input content: INSULTS',
              }),
            ]),
          }),
        ]),
      })
    );
  });

  it('generates UUID for messages without id', async () => {
    const messageWithoutId = createMockMessage({ id: undefined });
    setupSuccessfulTest();

    await callAppendConversationMessages([messageWithoutId]);

    expect(dataWriter.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        documentsToUpdate: expect.arrayContaining([
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                content: 'test content',
              }),
            ]),
          }),
        ]),
      })
    );
  });
});

describe('transformToUpdateScheme', () => {
  let existingConversation: ConversationResponse;

  beforeEach(() => {
    existingConversation = createMockConversation();
  });

  const testCases = [
    {
      name: 'transforms conversation to update schema correctly',
      conversation: () => existingConversation,
      messages: () => [createMockMessage()],
      expectedFields: (conv: ConversationResponse, msgs: Message[]) => ({
        id: conv.id,
        title: conv.title,
        api_config: {
          action_type_id: conv.apiConfig!.actionTypeId,
          connector_id: conv.apiConfig!.connectorId,
          default_system_prompt_id: conv.apiConfig!.defaultSystemPromptId,
          model: conv.apiConfig!.model,
          provider: conv.apiConfig!.provider,
        },
        exclude_from_last_conversation_storage: conv.excludeFromLastConversationStorage,
        messages: expect.arrayContaining([
          expect.objectContaining({
            '@timestamp': msgs[0].timestamp,
            id: msgs[0].id,
            content: msgs[0].content,
            role: msgs[0].role,
            user: msgs[0].user,
            trace_data: expect.objectContaining({
              trace_id: '1',
              transaction_id: '2',
            }),
          }),
        ]),
      }),
    },
    {
      name: 'handles conversation without optional fields',
      conversation: () =>
        createMockConversation({
          title: undefined,
          apiConfig: undefined,
          excludeFromLastConversationStorage: undefined,
          replacements: undefined,
        }),
      messages: () => [createMockMessage()],
      expectedFields: (conv: ConversationResponse) => ({
        id: conv.id,
        messages: expect.any(Array),
      }),
      shouldNotHaveFields: [
        'title',
        'api_config',
        'exclude_from_last_conversation_storage',
        'replacements',
      ],
    },
    {
      name: 'handles empty messages array',
      conversation: () => existingConversation,
      messages: () => [],
      expectedFields: (conv: ConversationResponse) => ({
        id: conv.id,
        messages: [],
      }),
    },
  ];

  testCases.forEach(({ name, conversation, messages, expectedFields, shouldNotHaveFields }) => {
    it(name, () => {
      const conv = conversation();
      const msgs = messages();
      const updatedAt = '2024-01-01T01:00:00.000Z';

      const result = transformToUpdateScheme(updatedAt, msgs, conv);

      expect(result).toMatchObject({
        updated_at: updatedAt,
        ...expectedFields(conv, msgs),
      });

      if (shouldNotHaveFields) {
        shouldNotHaveFields.forEach((field) => {
          expect(result).not.toHaveProperty(field);
        });
      }
    });
  });
});
