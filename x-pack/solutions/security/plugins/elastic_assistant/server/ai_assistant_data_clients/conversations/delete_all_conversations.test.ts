/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { DeleteAllConversationsParams, deleteAllConversations } from './delete_all_conversations';

export const getDeleteAllConversationsOptionsMock = (): DeleteAllConversationsParams => ({
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  conversationIndex: '.kibana-elastic-ai-assistant-conversations',
  logger: loggingSystemMock.createLogger(),
  excludedIds: ['test'],
});

describe('deleteAllConversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Delete all conversations', async () => {
    const mockResponse = { deleted: 1 };
    const options = getDeleteAllConversationsOptionsMock();
    options.esClient.deleteByQuery = jest.fn().mockResolvedValue(mockResponse);

    const deletedConversations = await deleteAllConversations(options);
    expect(deletedConversations).toEqual(mockResponse);
  });

  test('throw error if no conversation was deleted', async () => {
    const mockResponse = { deleted: 0 };
    const options = getDeleteAllConversationsOptionsMock();
    options.esClient.deleteByQuery = jest.fn().mockResolvedValue(mockResponse);

    await expect(deleteAllConversations(options)).rejects.toThrow(
      'No conversations have been deleted.'
    );
  });

  test('handles error from deleteByQuery', async () => {
    const mockError = new Error('Test Error');
    const options = getDeleteAllConversationsOptionsMock();
    options.esClient.deleteByQuery = jest.fn().mockRejectedValue(mockError);

    await expect(deleteAllConversations(options)).rejects.toThrow(mockError);
  });
});
