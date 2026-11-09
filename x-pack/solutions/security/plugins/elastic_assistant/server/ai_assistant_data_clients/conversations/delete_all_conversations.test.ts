/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { authenticatedUser } from '../../__mocks__/user';
import type { DeleteAllConversationsParams } from './delete_all_conversations';
import { deleteAllConversations } from './delete_all_conversations';

export const getDeleteAllConversationsOptionsMock = (): DeleteAllConversationsParams => ({
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  conversationIndex: '.kibana-elastic-ai-assistant-conversations',
  logger: loggingSystemMock.createLogger(),
  authenticatedUser,
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
    expect(options.esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            must: { match_all: {} },
            filter: {
              bool: {
                should: [
                  {
                    bool: {
                      must: [
                        { exists: { field: 'created_by' } },
                        {
                          bool: {
                            should: [
                              { term: { 'created_by.id': authenticatedUser.profile_uid } },
                              { term: { 'created_by.name': authenticatedUser.username } },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      must: [
                        { bool: { must_not: [{ exists: { field: 'created_by' } }] } },
                        {
                          nested: {
                            path: 'users',
                            query: {
                              bool: {
                                should: [
                                  { term: { 'users.id': authenticatedUser.profile_uid } },
                                  { term: { 'users.name': authenticatedUser.username } },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                          },
                        },
                      ],
                      must_not: [
                        {
                          nested: {
                            path: 'users',
                            query: {
                              bool: {
                                must_not: [
                                  { term: { 'users.id': authenticatedUser.profile_uid } },
                                  { term: { 'users.name': authenticatedUser.username } },
                                ],
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            must_not: { ids: { values: ['test'] } },
          },
        },
      })
    );
  });

  test('returns an empty result when no conversation was deleted', async () => {
    const mockResponse = { deleted: 0, total: 0 };
    const options = getDeleteAllConversationsOptionsMock();
    options.esClient.deleteByQuery = jest.fn().mockResolvedValue(mockResponse);

    await expect(deleteAllConversations(options)).resolves.toEqual(mockResponse);
    expect(options.logger.error).not.toHaveBeenCalled();
  });

  test('handles error from deleteByQuery', async () => {
    const mockError = new Error('Test Error');
    const options = getDeleteAllConversationsOptionsMock();
    options.esClient.deleteByQuery = jest.fn().mockRejectedValue(mockError);

    await expect(deleteAllConversations(options)).rejects.toThrow(mockError);
  });
});
