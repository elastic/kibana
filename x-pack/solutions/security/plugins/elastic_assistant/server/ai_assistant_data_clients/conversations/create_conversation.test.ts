/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { createConversation } from './create_conversation';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getConversation } from './get_conversation';
import { authenticatedUser } from '../../__mocks__/user';
import { ConversationCreateProps, ConversationResponse } from '@kbn/elastic-assistant-common';

jest.mock('./get_conversation', () => ({
  getConversation: jest.fn(),
}));

const mockUser1 = authenticatedUser;

export const getCreateConversationMock = (): ConversationCreateProps => ({
  title: 'test',
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: '1',
    defaultSystemPromptId: 'default-system-prompt',
    model: 'test-model',
    provider: 'OpenAI',
  },
  excludeFromLastConversationStorage: false,
  isDefault: false,
  messages: [],
  replacements: {},
  category: 'assistant',
});

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
  excludeFromLastConversationStorage: false,
  messages: [],
  replacements: {},
  createdAt: '2024-01-28T04:20:02.394Z',
  namespace: 'test',
  isDefault: false,
  updatedAt: '2024-01-28T04:20:02.394Z',
  timestamp: '2024-01-28T04:20:02.394Z',
  category: 'assistant',
  users: [
    {
      name: 'test',
    },
  ],
});

describe('createConversation', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.useFakeTimers();
    const date = '2024-01-28T04:20:02.394Z';
    jest.setSystemTime(new Date(date));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('it returns a conversation as expected with the id changed out for the elastic id', async () => {
    const conversation = getCreateConversationMock();
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce({
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
    });

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.create.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const createdConversation = await createConversation({
      esClient,
      conversationIndex: 'index-1',
      spaceId: 'test',
      user: mockUser1,
      conversation,
      logger,
    });

    const expected: ConversationResponse = {
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
    };

    expect(createdConversation).toEqual(expected);
  });

  test('it returns a conversation as expected with the id changed out for the elastic id and title set', async () => {
    const conversation: ConversationCreateProps = {
      ...getCreateConversationMock(),
      title: 'test new title',
    };
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce({
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
      title: 'test new title',
    });

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.create.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const createdConversation = await createConversation({
      esClient,
      conversationIndex: 'index-1',
      spaceId: 'test',
      user: mockUser1,
      conversation,
      logger,
    });

    const expected: ConversationResponse = {
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
      title: 'test new title',
    };
    expect(createdConversation).toEqual(expected);
  });

  test('It calls "esClient" with body, id, and conversationIndex', async () => {
    const conversation = getCreateConversationMock();
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(getConversationResponseMock());

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    await createConversation({
      esClient,
      conversationIndex: 'index-1',
      spaceId: 'test',
      user: mockUser1,
      conversation,
      logger,
    });

    expect(esClient.create).toBeCalled();
  });

  test('It returns an auto-generated id if id is sent in undefined', async () => {
    const conversation = getCreateConversationMock();
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce({
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
    });

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.create.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const createdConversation = await createConversation({
      esClient,
      conversationIndex: 'index-1',
      spaceId: 'test',
      user: mockUser1,
      conversation,
      logger,
    });

    const expected: ConversationResponse = {
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
    };
    expect(createdConversation).toEqual(expected);
  });
});
