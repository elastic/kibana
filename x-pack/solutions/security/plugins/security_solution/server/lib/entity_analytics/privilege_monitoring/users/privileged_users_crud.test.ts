/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { createPrivilegedUsersCrudService } from './privileged_users_crud';

import type { CreatePrivMonUserRequestBody } from '../../../../../common/api/entity_analytics/monitoring/users/create.gen';
import type { PrivMonUserSource } from '../types';
import { getPrivilegedMonitorUsersIndex } from '../../../../../common/entity_analytics/privileged_user_monitoring/utils';

describe('createPrivilegedUsersCrudService', () => {
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  const loggerMock = loggingSystemMock.createLogger();
  let crudService: ReturnType<typeof createPrivilegedUsersCrudService>;

  const TEST_INDEX = '.entity_analytics.monitoring.users-default';
  const mockUserInput: CreatePrivMonUserRequestBody = {
    user: {
      name: 'test-user',
    },
  };
  const mockSource: PrivMonUserSource = 'api';
  const maxUsersAllowed = 100;

  const mockNewUser = {
    id: 'new-user-id',
    user: {
      name: 'test-user',
      is_privileged: true,
      entity: {
        attributes: {
          Privileged: true,
        },
      },
    },
    labels: {
      sources: ['api'],
    },
    '@timestamp': '2025-08-25T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockEsClient = elasticsearchServiceMock.createScopedClusterClient();
    crudService = createPrivilegedUsersCrudService({
      esClient: mockEsClient.asCurrentUser,
      index: getPrivilegedMonitorUsersIndex('default'),
      logger: loggerMock,
    });
  });

  describe('create', () => {
    it('should create user even with empty user object', async () => {
      const invalidUserInput = { user: {} };

      // No search should be called since there's no username
      // But we can still mock it just to be safe
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 0, relation: 'eq' as const },
          max_score: null,
          hits: [],
        },
      });

      // Mock count to return under limit
      mockEsClient.asCurrentUser.count.mockResolvedValue({
        count: 5,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      // Mock successful index
      mockEsClient.asCurrentUser.index.mockResolvedValue({
        _id: 'new-user-id',
        _index: TEST_INDEX,
        _version: 1,
        result: 'created',
        _shards: { total: 1, successful: 1, failed: 0 },
      });

      // Mock get response for created user (without username)
      mockEsClient.asCurrentUser.get.mockResolvedValue({
        _id: 'new-user-id',
        _index: TEST_INDEX,
        _source: {
          user: {
            is_privileged: true,
            entity: {
              attributes: { Privileged: true },
            },
          },
          labels: { sources: ['api'] },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        },
        found: true,
        _version: 1,
      });

      const result = await crudService.create(invalidUserInput, mockSource, maxUsersAllowed);

      // Verify search was NOT called since there's no username
      expect(mockEsClient.asCurrentUser.search).not.toHaveBeenCalled();

      expect(result).toEqual(
        expect.objectContaining({
          id: 'new-user-id',
          user: expect.objectContaining({
            is_privileged: true,
          }),
        })
      );
    });

    it('should throw error when max users limit is reached', async () => {
      // Mock search for username uniqueness check - no existing user found
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 0, relation: 'eq' as const },
          max_score: null,
          hits: [],
        },
      });

      // Mock count to return limit reached
      mockEsClient.asCurrentUser.count.mockResolvedValue({
        count: 100,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      await expect(crudService.create(mockUserInput, mockSource, maxUsersAllowed)).rejects.toThrow(
        'Cannot create user: Maximum user limit of 100 reached'
      );

      // Verify the username uniqueness check was called
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith({
        index: TEST_INDEX,
        query: { term: { 'user.name': 'test-user' } },
        size: 1,
      });

      expect(mockEsClient.asCurrentUser.count).toHaveBeenCalledWith({
        index: TEST_INDEX,
        query: {
          term: {
            'user.is_privileged': true,
          },
        },
      });
    });

    it('should update existing user when username already exists', async () => {
      const existingUserId = 'existing-user-id';
      const existingUserDoc = {
        user: {
          name: 'test-user',
          is_privileged: true,
          entity: { attributes: { Privileged: false } },
        },
        labels: { sources: ['csv'] },
        '@timestamp': '2025-08-24T00:00:00.000Z',
      };

      // Mock search for username uniqueness check - existing user found
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' as const },
          max_score: 1.0,
          hits: [
            {
              _index: TEST_INDEX,
              _id: existingUserId,
              _score: 1.0,
              _source: existingUserDoc,
            },
          ],
        },
      });

      // Mock successful update
      mockEsClient.asCurrentUser.update.mockResolvedValue({
        _id: existingUserId,
        _index: TEST_INDEX,
        result: 'updated' as const,
        _shards: { total: 1, successful: 1, failed: 0 },
        _version: 2,
      });

      // Mock get response for updated user
      const updatedUserDoc = {
        ...existingUserDoc,
        user: {
          ...mockUserInput.user,
          is_privileged: true,
          entity: { attributes: { Privileged: true } },
        },
        labels: { sources: ['csv', 'api'] }, // Should merge sources
      };

      mockEsClient.asCurrentUser.get.mockResolvedValue({
        _id: existingUserId,
        _index: TEST_INDEX,
        _source: updatedUserDoc,
        found: true,
        _version: 2,
      });

      const result = await crudService.create(mockUserInput, mockSource, maxUsersAllowed);

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith({
        index: TEST_INDEX,
        query: { term: { 'user.name': 'test-user' } },
        size: 1,
      });

      const updateCall = mockEsClient.asCurrentUser.update.mock.calls[0][0];
      expect(updateCall).toEqual(
        expect.objectContaining({
          index: TEST_INDEX,
          id: existingUserId,
          refresh: 'wait_for',
        })
      );

      expect(updateCall.doc).toEqual(
        expect.objectContaining({
          ...mockUserInput,
          '@timestamp': expect.any(String),
          event: expect.objectContaining({
            ingested: expect.any(String),
            '@timestamp': expect.any(String),
          }),
          user: expect.objectContaining({
            ...mockUserInput.user,
            is_privileged: true,
            entity: { attributes: { Privileged: true } },
          }),
          labels: { sources: ['csv', 'api'] },
          entity_analytics_monitoring: {
            labels: [],
          },
        })
      );

      // Should not call count since we're updating, not creating
      expect(mockEsClient.asCurrentUser.count).not.toHaveBeenCalled();

      expect(result).toEqual(
        expect.objectContaining({
          id: existingUserId,
          user: expect.objectContaining({
            name: 'test-user',
            is_privileged: true,
            entity: { attributes: { Privileged: true } },
          }),
          labels: expect.objectContaining({
            sources: ['csv', 'api'],
          }),
        })
      );
    });

    it('should create new user when under limit', async () => {
      // Mock search for username uniqueness check - no existing user found
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 0, relation: 'eq' as const },
          max_score: null,
          hits: [],
        },
      });

      // Mock count to return under limit
      mockEsClient.asCurrentUser.count.mockResolvedValue({
        count: 5,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      // Mock successful index
      mockEsClient.asCurrentUser.index.mockResolvedValue({
        _id: 'new-user-id',
        _index: TEST_INDEX,
        _version: 1,
        result: 'created',
        _shards: { total: 1, successful: 1, failed: 0 },
      });

      // Mock get response for created user
      mockEsClient.asCurrentUser.get.mockResolvedValue({
        _id: 'new-user-id',
        _index: TEST_INDEX,
        _source: mockNewUser,
        found: true,
        _version: 1,
      });

      const result = await crudService.create(mockUserInput, mockSource, maxUsersAllowed);

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith({
        index: TEST_INDEX,
        query: { term: { 'user.name': 'test-user' } },
        size: 1,
      });
      expect(mockEsClient.asCurrentUser.count).toHaveBeenCalled();
      expect(mockEsClient.asCurrentUser.index).toHaveBeenCalledWith({
        index: TEST_INDEX,
        refresh: 'wait_for',
        document: expect.objectContaining({
          user: expect.objectContaining({
            name: 'test-user',
            is_privileged: true,
            entity: { attributes: { Privileged: true } },
          }),
          labels: {
            sources: ['api'],
          },
        }),
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 'new-user-id',
          user: expect.objectContaining({
            name: 'test-user',
            is_privileged: true,
            entity: { attributes: { Privileged: true } },
          }),
        })
      );
    });

    it('should create new user when existing user has no ID', async () => {
      // Mock search for username uniqueness check - existing user found but no ID
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' as const },
          max_score: 1.0,
          hits: [
            {
              _index: TEST_INDEX,
              _id: undefined, // No ID - edge case
              _score: 1.0,
              _source: {
                user: {
                  name: 'test-user',
                  is_privileged: true,
                  entity: { attributes: { Privileged: true } },
                },
                labels: { sources: ['csv'] },
                '@timestamp': '2025-08-24T00:00:00.000Z',
              },
            },
          ],
        },
      });

      // Mock count to return under limit
      mockEsClient.asCurrentUser.count.mockResolvedValue({
        count: 5,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      // Mock successful index
      mockEsClient.asCurrentUser.index.mockResolvedValue({
        _id: 'new-user-id',
        _index: TEST_INDEX,
        _version: 1,
        result: 'created',
        _shards: { total: 1, successful: 1, failed: 0 },
      });

      // Mock get response for created user
      mockEsClient.asCurrentUser.get.mockResolvedValue({
        _id: 'new-user-id',
        _index: TEST_INDEX,
        _source: mockNewUser,
        found: true,
        _version: 1,
      });

      const result = await crudService.create(mockUserInput, mockSource, maxUsersAllowed);

      // Should create new user since existing user had no ID
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalled();
      expect(mockEsClient.asCurrentUser.count).toHaveBeenCalled();
      expect(mockEsClient.asCurrentUser.index).toHaveBeenCalled();
      expect(mockEsClient.asCurrentUser.update).not.toHaveBeenCalled();

      expect(result).toEqual(
        expect.objectContaining({
          id: 'new-user-id',
          user: expect.objectContaining({
            name: 'test-user',
            is_privileged: true,
            entity: { attributes: { Privileged: true } },
          }),
        })
      );
    });
  });

  describe('get', () => {
    it('should return user when document exists', async () => {
      const mockGetResponse = {
        _index: TEST_INDEX,
        _id: 'test-id',
        _source: {
          user: {
            name: 'test-user',
            is_privileged: true,
            entity: { attributes: { Privileged: true } },
          },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        },
        found: true,
        _version: 1,
      };

      mockEsClient.asCurrentUser.get.mockResolvedValue(mockGetResponse);

      const result = await crudService.get('test-id');

      expect(mockEsClient.asCurrentUser.get).toHaveBeenCalledWith({
        index: TEST_INDEX,
        id: 'test-id',
      });
      expect(result).toEqual({
        id: 'test-id',
        user: {
          name: 'test-user',
          is_privileged: true,
          entity: { attributes: { Privileged: true } },
        },
        '@timestamp': '2025-08-25T00:00:00.000Z',
      });
    });

    it('should return undefined when document does not exist', async () => {
      const mockGetResponse = {
        _index: TEST_INDEX,
        _id: 'non-existent-id',
        found: false,
      };

      mockEsClient.asCurrentUser.get.mockResolvedValue(mockGetResponse);

      const result = await crudService.get('non-existent-id');

      expect(mockEsClient.asCurrentUser.get).toHaveBeenCalledWith({
        index: TEST_INDEX,
        id: 'non-existent-id',
      });
      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update user and return updated document', async () => {
      const updateData = { user: { name: 'updated-name' } };
      const mockUpdateResponse = {
        _id: 'test-id',
        _index: TEST_INDEX,
        result: 'updated' as const,
        _shards: { total: 1, successful: 1, failed: 0 },
        _version: 2,
      };
      const mockGetResponse = {
        _index: TEST_INDEX,
        _id: 'test-id',
        _source: {
          user: {
            name: 'updated-name',
            is_privileged: true,
            entity: { attributes: { Privileged: true } },
          },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        },
        found: true,
        _version: 2,
      };

      mockEsClient.asCurrentUser.update.mockResolvedValue(mockUpdateResponse);
      mockEsClient.asCurrentUser.get.mockResolvedValue(mockGetResponse);

      const result = await crudService.update('test-id', updateData);

      expect(mockEsClient.asCurrentUser.update).toHaveBeenCalledWith({
        index: TEST_INDEX,
        refresh: 'wait_for',
        id: 'test-id',
        doc: {
          ...updateData,
          entity_analytics_monitoring: {
            labels: [],
          },
        },
      });
      expect(result).toEqual({
        id: 'test-id',
        user: {
          name: 'updated-name',
          is_privileged: true,
          entity: { attributes: { Privileged: true } },
        },
        '@timestamp': '2025-08-25T00:00:00.000Z',
      });
    });
  });

  describe('list', () => {
    it('should return all users when no kuery is provided', async () => {
      const mockSearchResponse = {
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 2, relation: 'eq' as const },
          max_score: 1.0,
          hits: [
            {
              _index: TEST_INDEX,
              _id: 'user1',
              _score: 1.0,
              _source: {
                user: {
                  name: 'user1',
                  is_privileged: true,
                  entity: { attributes: { Privileged: true } },
                },
                '@timestamp': '2025-08-25T00:00:00.000Z',
              },
            },
            {
              _index: TEST_INDEX,
              _id: 'user2',
              _score: 1.0,
              _source: {
                user: {
                  name: 'user2',
                  is_privileged: true,
                  entity: { attributes: { Privileged: true } },
                },
                '@timestamp': '2025-08-25T01:00:00.000Z',
              },
            },
          ],
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue(mockSearchResponse);

      const result = await crudService.list();

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith({
        size: 10000,
        index: TEST_INDEX,
        query: { match_all: {} },
      });
      expect(result).toEqual([
        {
          id: 'user1',
          user: {
            name: 'user1',
            is_privileged: true,
            entity: { attributes: { Privileged: true } },
          },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        },
        {
          id: 'user2',
          user: {
            name: 'user2',
            is_privileged: true,
            entity: { attributes: { Privileged: true } },
          },
          '@timestamp': '2025-08-25T01:00:00.000Z',
        },
      ]);
    });

    it('should filter users when kuery is provided', async () => {
      const kuery = 'user.name: "test-user"';
      const mockSearchResponse = {
        took: 3,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' as const },
          max_score: 1.0,
          hits: [
            {
              _index: TEST_INDEX,
              _id: 'user1',
              _score: 1.0,
              _source: {
                user: { name: 'test-user', is_privileged: true },
                '@timestamp': '2025-08-25T00:00:00.000Z',
              },
            },
          ],
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue(mockSearchResponse);

      const result = await crudService.list(kuery);

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith({
        size: 10000,
        index: TEST_INDEX,
        query: expect.objectContaining({
          // The exact query structure depends on toElasticsearchQuery implementation
        }),
      });
      expect(result).toHaveLength(1);
      expect(result[0].user?.name).toBe('test-user');
    });
  });

  describe('delete', () => {
    it('should delete user by id', async () => {
      // Mock get to return a user so delete can proceed
      mockEsClient.asCurrentUser.get.mockResolvedValue({
        _id: 'test-id',
        _index: TEST_INDEX,
        _source: {
          id: 'test-id',
          user: { name: 'test-user', is_privileged: true },
          labels: { sources: ['api'] },
          entity_analytics_monitoring: { labels: [] },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        },
        found: true,
        _version: 1,
      });

      const mockDeleteResponse = {
        _id: 'test-id',
        _index: TEST_INDEX,
        result: 'deleted' as const,
        _shards: { total: 1, successful: 1, failed: 0 },
        _version: 2,
      };
      mockEsClient.asCurrentUser.delete.mockResolvedValue(mockDeleteResponse);

      await crudService.delete('test-id');

      expect(mockEsClient.asCurrentUser.delete).toHaveBeenCalledWith({
        index: TEST_INDEX,
        id: 'test-id',
      });
    });
  });

  describe('label functionality', () => {
    describe('create with labels', () => {
      it('should create new user with API labels', async () => {
        const userWithLabels: CreatePrivMonUserRequestBody = {
          user: {
            name: 'test-user',
          },
          entity_analytics_monitoring: {
            labels: [
              { field: 'department', value: 'engineering', source: 'api' },
              { field: 'role', value: 'admin', source: 'api' },
            ],
          },
        };

        // Mock search for username uniqueness check - no existing user found
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 0, relation: 'eq' as const },
            max_score: null,
            hits: [],
          },
        });

        // Mock count to return under limit
        mockEsClient.asCurrentUser.count.mockResolvedValue({
          count: 5,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        });

        // Mock successful index
        mockEsClient.asCurrentUser.index.mockResolvedValue({
          _id: 'new-user-id',
          _index: TEST_INDEX,
          _version: 1,
          result: 'created',
          _shards: { total: 1, successful: 1, failed: 0 },
        });

        // Mock get response for created user
        const createdUser = {
          id: 'new-user-id',
          user: {
            name: 'test-user',
            is_privileged: true,
          },
          labels: {
            sources: ['api'],
          },
          entity_analytics_monitoring: {
            labels: [
              { field: 'department', value: 'engineering', source: 'api' },
              { field: 'role', value: 'admin', source: 'api' },
            ],
          },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        };

        mockEsClient.asCurrentUser.get.mockResolvedValue({
          _id: 'new-user-id',
          _index: TEST_INDEX,
          _source: createdUser,
          found: true,
          _version: 1,
        });

        const result = await crudService.create(userWithLabels, mockSource, maxUsersAllowed);

        expect(mockEsClient.asCurrentUser.index).toHaveBeenCalledWith({
          index: TEST_INDEX,
          refresh: 'wait_for',
          document: expect.objectContaining({
            user: expect.objectContaining({
              name: 'test-user',
              is_privileged: true,
            }),
            labels: {
              sources: ['api'],
            },
            entity_analytics_monitoring: {
              labels: [
                { field: 'department', value: 'engineering', source: 'api' },
                { field: 'role', value: 'admin', source: 'api' },
              ],
            },
          }),
        });
        expect(result).toEqual(expect.objectContaining(createdUser));
      });

      it('should merge API labels with existing CSV labels when updating existing user', async () => {
        const userWithLabels: CreatePrivMonUserRequestBody = {
          user: {
            name: 'existing-user',
          },
          entity_analytics_monitoring: {
            labels: [{ field: 'department', value: 'engineering', source: 'api' }],
          },
        };

        const existingUser = {
          id: 'existing-user-id',
          user: {
            name: 'existing-user',
            is_privileged: true,
          },
          labels: {
            sources: ['csv'],
          },
          entity_analytics_monitoring: {
            labels: [{ field: 'location', value: 'NYC', source: 'csv' }],
          },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        };

        // Mock search for existing user
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 1, relation: 'eq' as const },
            max_score: 1.0,
            hits: [
              {
                _id: 'existing-user-id',
                _index: TEST_INDEX,
                _source: existingUser,
                _score: 1.0,
              },
            ],
          },
        });

        // Mock successful update
        mockEsClient.asCurrentUser.update.mockResolvedValue({
          _id: 'existing-user-id',
          _index: TEST_INDEX,
          _version: 2,
          result: 'updated',
          _shards: { total: 1, successful: 1, failed: 0 },
        });

        // Mock get response for updated user
        const updatedUser = {
          ...existingUser,
          labels: {
            sources: ['csv', 'api'],
          },
          entity_analytics_monitoring: {
            labels: [
              { field: 'location', value: 'NYC', source: 'csv' },
              { field: 'department', value: 'engineering', source: 'api' },
            ],
          },
        };

        mockEsClient.asCurrentUser.get.mockResolvedValue({
          _id: 'existing-user-id',
          _index: TEST_INDEX,
          _source: updatedUser,
          found: true,
          _version: 2,
        });

        const result = await crudService.create(userWithLabels, mockSource, maxUsersAllowed);

        expect(mockEsClient.asCurrentUser.update).toHaveBeenCalledWith({
          index: TEST_INDEX,
          id: 'existing-user-id',
          refresh: 'wait_for',
          doc: expect.objectContaining({
            user: expect.objectContaining({
              name: 'existing-user',
              is_privileged: true,
            }),
            labels: {
              sources: ['csv', 'api'],
            },
            entity_analytics_monitoring: {
              labels: [
                { field: 'location', value: 'NYC', source: 'csv' },
                { field: 'department', value: 'engineering', source: 'api' },
              ],
            },
          }),
        });
        expect(result).toEqual(expect.objectContaining(updatedUser));
      });
    });

    describe('update with labels', () => {
      it('should update user with new API labels', async () => {
        const existingUser = {
          id: 'test-user-id',
          user: {
            name: 'test-user',
            is_privileged: true,
          },
          labels: {
            sources: ['csv', 'api'],
          },
          entity_analytics_monitoring: {
            labels: [
              { field: 'location', value: 'NYC', source: 'csv' },
              { field: 'department', value: 'engineering', source: 'api' },
            ],
          },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        };

        const updateRequest = {
          user: {
            name: 'test-user',
          },
          entity_analytics_monitoring: {
            labels: [
              { field: 'department', value: 'product', source: 'api' },
              { field: 'level', value: 'senior', source: 'api' },
            ],
          },
        };

        // Mock get for existing user
        mockEsClient.asCurrentUser.get.mockResolvedValue({
          _id: 'test-user-id',
          _index: TEST_INDEX,
          _source: existingUser,
          found: true,
          _version: 1,
        });

        // Mock successful update
        mockEsClient.asCurrentUser.update.mockResolvedValue({
          _id: 'test-user-id',
          _index: TEST_INDEX,
          _version: 2,
          result: 'updated',
          _shards: { total: 1, successful: 1, failed: 0 },
        });

        // Mock get response for updated user
        const updatedUser = {
          ...existingUser,
          entity_analytics_monitoring: {
            labels: [
              { field: 'location', value: 'NYC', source: 'csv' },
              { field: 'department', value: 'product', source: 'api' },
              { field: 'level', value: 'senior', source: 'api' },
            ],
          },
        };

        mockEsClient.asCurrentUser.get
          .mockResolvedValueOnce({
            _id: 'test-user-id',
            _index: TEST_INDEX,
            _source: existingUser,
            found: true,
            _version: 1,
          })
          .mockResolvedValueOnce({
            _id: 'test-user-id',
            _index: TEST_INDEX,
            _source: updatedUser,
            found: true,
            _version: 2,
          });

        const result = await crudService.update('test-user-id', updateRequest);

        expect(mockEsClient.asCurrentUser.update).toHaveBeenCalledWith({
          index: TEST_INDEX,
          id: 'test-user-id',
          refresh: 'wait_for',
          doc: expect.objectContaining({
            user: expect.objectContaining({
              name: 'test-user',
            }),
            entity_analytics_monitoring: {
              labels: [
                { field: 'location', value: 'NYC', source: 'csv' },
                { field: 'department', value: 'product', source: 'api' },
                { field: 'level', value: 'senior', source: 'api' },
              ],
            },
          }),
        });
        expect(result).toEqual(expect.objectContaining(updatedUser));
      });
    });

    describe('delete with source-aware logic', () => {
      it('should only remove API labels when user has non-API sources', async () => {
        const existingUser = {
          id: 'test-user-id',
          user: {
            name: 'test-user',
            is_privileged: true,
          },
          labels: {
            sources: ['csv', 'api'],
          },
          entity_analytics_monitoring: {
            labels: [
              { field: 'location', value: 'NYC', source: 'csv' },
              { field: 'department', value: 'engineering', source: 'api' },
            ],
          },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        };

        // Mock get for existing user
        mockEsClient.asCurrentUser.get.mockResolvedValue({
          _id: 'test-user-id',
          _index: TEST_INDEX,
          _source: existingUser,
          found: true,
          _version: 1,
        });

        // Mock successful update (not delete)
        mockEsClient.asCurrentUser.update.mockResolvedValue({
          _id: 'test-user-id',
          _index: TEST_INDEX,
          _version: 2,
          result: 'updated',
          _shards: { total: 1, successful: 1, failed: 0 },
        });

        await crudService.delete('test-user-id');

        expect(mockEsClient.asCurrentUser.update).toHaveBeenCalledWith({
          index: TEST_INDEX,
          id: 'test-user-id',
          refresh: 'wait_for',
          doc: {
            labels: {
              sources: ['csv'],
            },
            entity_analytics_monitoring: {
              labels: [{ field: 'location', value: 'NYC', source: 'csv' }],
            },
          },
        });
        expect(mockEsClient.asCurrentUser.delete).not.toHaveBeenCalled();
      });

      it('should delete entire user when only API source exists', async () => {
        const existingUser = {
          id: 'test-user-id',
          user: {
            name: 'test-user',
            is_privileged: true,
          },
          labels: {
            sources: ['api'],
          },
          entity_analytics_monitoring: {
            labels: [{ field: 'department', value: 'engineering', source: 'api' }],
          },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        };

        // Mock get for existing user
        mockEsClient.asCurrentUser.get.mockResolvedValue({
          _id: 'test-user-id',
          _index: TEST_INDEX,
          _source: existingUser,
          found: true,
          _version: 1,
        });

        // Mock successful delete
        mockEsClient.asCurrentUser.delete.mockResolvedValue({
          _id: 'test-user-id',
          _index: TEST_INDEX,
          _version: 2,
          result: 'deleted',
          _shards: { total: 1, successful: 1, failed: 0 },
        });

        await crudService.delete('test-user-id');

        expect(mockEsClient.asCurrentUser.delete).toHaveBeenCalledWith({
          index: TEST_INDEX,
          id: 'test-user-id',
        });
        expect(mockEsClient.asCurrentUser.update).not.toHaveBeenCalled();
      });

      it('should throw error when user not found during delete', async () => {
        // Mock get to return not found
        mockEsClient.asCurrentUser.get.mockResolvedValue({
          _id: 'test-user-id',
          _index: TEST_INDEX,
          found: false,
        });

        await expect(crudService.delete('test-user-id')).rejects.toThrow(
          'User with id test-user-id not found'
        );
      });
    });
  });

  describe('error handling', () => {
    it('should propagate elasticsearch errors on create', async () => {
      // Mock search for username uniqueness check - no existing user found
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 0, relation: 'eq' as const },
          max_score: null,
          hits: [],
        },
      });

      // Mock count to pass the limit check
      mockEsClient.asCurrentUser.count.mockResolvedValue({
        count: 5,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      const esError = new Error('Elasticsearch connection failed');
      mockEsClient.asCurrentUser.index.mockRejectedValue(esError);

      await expect(crudService.create(mockUserInput, mockSource, maxUsersAllowed)).rejects.toThrow(
        'Elasticsearch connection failed'
      );
    });

    it('should propagate elasticsearch errors on username search', async () => {
      const esError = new Error('Search failed');
      mockEsClient.asCurrentUser.search.mockRejectedValue(esError);

      await expect(crudService.create(mockUserInput, mockSource, maxUsersAllowed)).rejects.toThrow(
        'Search failed'
      );
    });

    it('should propagate elasticsearch errors on get', async () => {
      const esError = new Error('Document not found');
      mockEsClient.asCurrentUser.get.mockRejectedValue(esError);

      await expect(crudService.get('test-id')).rejects.toThrow('Document not found');
    });

    it('should propagate elasticsearch errors on update', async () => {
      // Mock get to return a user so we can test the update error
      mockEsClient.asCurrentUser.get.mockResolvedValue({
        _id: 'test-id',
        _index: TEST_INDEX,
        _source: {
          id: 'test-id',
          user: { name: 'test-user', is_privileged: true },
          labels: { sources: ['api'] },
          entity_analytics_monitoring: { labels: [] },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        },
        found: true,
        _version: 1,
      });

      const esError = new Error('Update failed');
      mockEsClient.asCurrentUser.update.mockRejectedValue(esError);

      await expect(crudService.update('test-id', { user: { name: 'updated' } })).rejects.toThrow(
        'Update failed'
      );
    });

    it('should propagate elasticsearch errors on list', async () => {
      const esError = new Error('Search failed');
      mockEsClient.asCurrentUser.search.mockRejectedValue(esError);

      await expect(crudService.list()).rejects.toThrow('Search failed');
    });

    it('should propagate elasticsearch errors on delete', async () => {
      // Mock get to return a user so we can test the delete error
      mockEsClient.asCurrentUser.get.mockResolvedValue({
        _id: 'test-id',
        _index: TEST_INDEX,
        _source: {
          id: 'test-id',
          user: { name: 'test-user', is_privileged: true },
          labels: { sources: ['api'] },
          entity_analytics_monitoring: { labels: [] },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        },
        found: true,
        _version: 1,
      });

      const esError = new Error('Delete failed');
      mockEsClient.asCurrentUser.delete.mockRejectedValue(esError);

      await expect(crudService.delete('test-id')).rejects.toThrow('Delete failed');
    });
  });
});
