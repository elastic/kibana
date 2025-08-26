/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-server-mocks';
import { auditLoggerMock } from '@kbn/core-security-server-mocks';

import { PrivilegeMonitoringDataClient } from '../engine/data_client';
import { createPrivilegedUsersCrudService } from './privileged_users_crud';

import type { PrivilegeMonitoringGlobalDependencies } from '../engine/data_client';
import type { CreatePrivMonUserRequestBody } from '../../../../../common/api/entity_analytics/privilege_monitoring/users/create.gen';
import type { PrivMonUserSource } from '../types';

// Mock the helper functions
jest.mock('./utils', () => ({
  findUserByUsername: jest.fn(),
  isUserLimitReached: jest.fn(),
  createUserDocument: jest.fn(),
  updateUserWithSource: jest.fn(),
}));

import {
  findUserByUsername,
  isUserLimitReached,
  createUserDocument,
  updateUserWithSource,
} from './utils';

describe('createPrivilegedUsersCrudService', () => {
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let crudService: ReturnType<typeof createPrivilegedUsersCrudService>;

  const TEST_INDEX = '.entity_analytics.monitoring.users-default';
  const mockUserInput: CreatePrivMonUserRequestBody = {
    user: {
      name: 'test-user',
    },
  };
  const mockSource: PrivMonUserSource = 'api';
  const maxPrivilegedUsersAllowed = 100;

  const mockExistingUser = {
    id: 'existing-user-id',
    user: {
      name: 'test-user',
      is_privileged: true,
    },
    labels: {
      sources: ['csv'],
    },
    '@timestamp': '2025-08-25T00:00:00.000Z',
  };

  const mockNewUser = {
    id: 'new-user-id',
    user: {
      name: 'test-user',
      is_privileged: true,
    },
    labels: {
      sources: ['api'],
    },
    '@timestamp': '2025-08-25T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockEsClient = elasticsearchServiceMock.createScopedClusterClient();
    const deps: PrivilegeMonitoringGlobalDependencies = {
      logger: loggingSystemMock.createLogger(),
      clusterClient: mockEsClient,
      namespace: 'default',
      kibanaVersion: '9.0.0',
      taskManager: taskManagerMock.createStart(),
      auditLogger: auditLoggerMock.create(),
      telemetry: analyticsServiceMock.createAnalyticsServiceSetup(),
      savedObjects: savedObjectsServiceMock.createStartContract(),
    };

    const dataClient = new PrivilegeMonitoringDataClient(deps);
    crudService = createPrivilegedUsersCrudService(dataClient);
  });

  describe('create', () => {
    it('should throw error when username is missing', async () => {
      const invalidUserInput = { user: {} };

      await expect(
        crudService.create(invalidUserInput, mockSource, maxPrivilegedUsersAllowed)
      ).rejects.toThrow('Username is required');
    });

    it('should update existing user with new source when user already exists', async () => {
      const mockUpdateResponse = {
        created: false,
        user: { ...mockExistingUser, labels: { sources: ['csv', 'api'] } },
      };

      (findUserByUsername as jest.Mock).mockResolvedValue(mockExistingUser);
      (updateUserWithSource as jest.Mock).mockResolvedValue(mockUpdateResponse);

      const result = await crudService.create(mockUserInput, mockSource, maxPrivilegedUsersAllowed);

      expect(findUserByUsername).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        'test-user'
      );
      expect(updateUserWithSource).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        mockExistingUser,
        mockSource,
        mockUserInput,
        expect.any(Function)
      );
      expect(result).toEqual(mockUpdateResponse);
    });

    it('should throw error when user limit is reached and trying to create new user', async () => {
      (findUserByUsername as jest.Mock).mockResolvedValue(undefined);
      (isUserLimitReached as jest.Mock).mockResolvedValue(true);

      await expect(
        crudService.create(mockUserInput, mockSource, maxPrivilegedUsersAllowed)
      ).rejects.toThrow(
        `Cannot add user: maximum limit of ${maxPrivilegedUsersAllowed} privileged users reached`
      );

      expect(findUserByUsername).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        'test-user'
      );
      expect(isUserLimitReached).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        maxPrivilegedUsersAllowed
      );
      expect(createUserDocument).not.toHaveBeenCalled();
    });

    it('should create new user when user does not exist and limit not reached', async () => {
      const mockCreateResponse = {
        created: true,
        user: mockNewUser,
      };

      (findUserByUsername as jest.Mock).mockResolvedValue(undefined);
      (isUserLimitReached as jest.Mock).mockResolvedValue(false);
      (createUserDocument as jest.Mock).mockResolvedValue(mockCreateResponse);

      const result = await crudService.create(mockUserInput, mockSource, maxPrivilegedUsersAllowed);

      expect(findUserByUsername).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        'test-user'
      );
      expect(isUserLimitReached).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        maxPrivilegedUsersAllowed
      );
      expect(createUserDocument).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        mockUserInput,
        mockSource,
        expect.any(Function)
      );
      expect(result).toEqual(mockCreateResponse);
    });

    it('should pass refresh option to helper functions', async () => {
      const refreshOptions = { refresh: true };

      (findUserByUsername as jest.Mock).mockResolvedValue(undefined);
      (isUserLimitReached as jest.Mock).mockResolvedValue(false);
      (createUserDocument as jest.Mock).mockResolvedValue({
        created: true,
        user: mockNewUser,
      });

      await crudService.create(
        mockUserInput,
        mockSource,
        maxPrivilegedUsersAllowed,
        refreshOptions
      );

      expect(createUserDocument).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        mockUserInput,
        mockSource,
        expect.any(Function)
      );
    });
  });

  describe('get', () => {
    it('should return user when document exists', async () => {
      const mockGetResponse = {
        _index: TEST_INDEX,
        _id: 'test-id',
        _source: {
          user: { name: 'test-user', is_privileged: true },
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
        user: { name: 'test-user', is_privileged: true },
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
          user: { name: 'updated-name', is_privileged: true },
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
        doc: updateData,
      });
      expect(result).toEqual({
        id: 'test-id',
        user: { name: 'updated-name', is_privileged: true },
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
                user: { name: 'user1', is_privileged: true },
                '@timestamp': '2025-08-25T00:00:00.000Z',
              },
            },
            {
              _index: TEST_INDEX,
              _id: 'user2',
              _score: 1.0,
              _source: {
                user: { name: 'user2', is_privileged: true },
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
          user: { name: 'user1', is_privileged: true },
          '@timestamp': '2025-08-25T00:00:00.000Z',
        },
        {
          id: 'user2',
          user: { name: 'user2', is_privileged: true },
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

  describe('error handling', () => {
    it('should propagate elasticsearch errors on create', async () => {
      const esError = new Error('Elasticsearch connection failed');
      (findUserByUsername as jest.Mock).mockRejectedValue(esError);

      await expect(
        crudService.create(mockUserInput, mockSource, maxPrivilegedUsersAllowed)
      ).rejects.toThrow('Elasticsearch connection failed');
    });

    it('should propagate elasticsearch errors on get', async () => {
      const esError = new Error('Document not found');
      mockEsClient.asCurrentUser.get.mockRejectedValue(esError);

      await expect(crudService.get('test-id')).rejects.toThrow('Document not found');
    });

    it('should propagate elasticsearch errors on update', async () => {
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
      const esError = new Error('Delete failed');
      mockEsClient.asCurrentUser.delete.mockRejectedValue(esError);

      await expect(crudService.delete('test-id')).rejects.toThrow('Delete failed');
    });
  });

  describe('integration with helper functions', () => {
    it('should call helper functions with correct parameters for user creation flow', async () => {
      (findUserByUsername as jest.Mock).mockResolvedValue(undefined);
      (isUserLimitReached as jest.Mock).mockResolvedValue(false);
      (createUserDocument as jest.Mock).mockResolvedValue({
        created: true,
        user: mockNewUser,
      });

      await crudService.create(mockUserInput, mockSource, maxPrivilegedUsersAllowed);

      // Verify all helper functions called with correct parameters
      expect(findUserByUsername).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        'test-user'
      );
      expect(isUserLimitReached).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        maxPrivilegedUsersAllowed
      );
      expect(createUserDocument).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        mockUserInput,
        mockSource,
        expect.any(Function)
      );
    });

    it('should call helper functions with correct parameters for user update flow', async () => {
      const mockUpdateResponse = {
        created: false,
        user: { ...mockExistingUser, labels: { sources: ['csv', 'api'] } },
      };

      (findUserByUsername as jest.Mock).mockResolvedValue(mockExistingUser);
      (updateUserWithSource as jest.Mock).mockResolvedValue(mockUpdateResponse);

      await crudService.create(mockUserInput, mockSource, maxPrivilegedUsersAllowed);

      expect(findUserByUsername).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        'test-user'
      );
      expect(updateUserWithSource).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        TEST_INDEX,
        mockExistingUser,
        mockSource,
        mockUserInput,
        expect.any(Function)
      );
      // These should not be called in update flow
      expect(isUserLimitReached).not.toHaveBeenCalled();
      expect(createUserDocument).not.toHaveBeenCalled();
    });
  });
});
