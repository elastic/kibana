/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
  analyticsServiceMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import type { PrivilegeMonitoringGlobalDependencies } from '../../engine/data_client';
import { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import type { IndexSyncService } from './index_sync';
import { createIndexSyncService } from './index_sync';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { AuditLogger } from '@kbn/core/server';
import type { SearchService } from '../../users/search';
import type { BulkResponse } from 'elasticsearch-8.x/lib/api/types';

const mockFindByIndex = jest.fn();
jest.mock('../../saved_objects', () => {
  return {
    MonitoringEntitySourceDescriptorClient: jest.fn().mockImplementation(() => ({
      findByIndex: () => mockFindByIndex(),
      create: jest.fn(),
    })),
    PrivilegeMonitoringEngineDescriptorClient: jest.fn().mockImplementation(() => ({
      init: jest.fn().mockResolvedValue({ status: 'success' }),
      update: jest.fn(),
    })),
  };
});

const mockFindStaleUsersForIndex = jest.fn();
jest.mock('./stale_users', () => {
  return {
    findStaleUsersForIndexFactory: () => mockFindStaleUsersForIndex,
  };
});

const mockSearchUsernamesInIndex = jest.fn();
const mockGetMonitoredUsers = jest.fn();
jest.mock('../../users/search', () => {
  return {
    createSearchService: () => ({
      searchUsernamesInIndex: (obj: Parameters<SearchService['searchUsernamesInIndex']>[0]) =>
        mockSearchUsernamesInIndex(obj),
      getMonitoredUsers: (usernames: string[]) => mockGetMonitoredUsers(usernames),
    }),
  };
});

const mockBulkUpsertOperations = jest.fn();
jest.mock('../bulk/upsert', () => {
  return {
    bulkUpsertOperationsFactory: () => mockBulkUpsertOperations,
  };
});

describe('Privileged User Monitoring: Index Sync Service', () => {
  const mockSavedObjectClient = savedObjectsClientMock.create();
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
  const esClientMock = clusterClientMock.asCurrentUser;
  const loggerMock = loggingSystemMock.createLogger();
  const auditMock = { log: jest.fn().mockReturnValue(undefined) } as unknown as AuditLogger;
  const telemetryMock = analyticsServiceMock.createAnalyticsServiceSetup();

  const savedObjectServiceMock = savedObjectsServiceMock.createStartContract();
  const deps: PrivilegeMonitoringGlobalDependencies = {
    logger: loggerMock,
    clusterClient: clusterClientMock,
    namespace: 'default',
    kibanaVersion: '9.0.0',
    taskManager: {} as TaskManagerStartContract,
    auditLogger: auditMock,
    telemetry: telemetryMock,
    savedObjects: savedObjectServiceMock,
  };

  let indexSyncService: IndexSyncService;
  let dataClient: PrivilegeMonitoringDataClient;

  beforeEach(() => {
    jest.clearAllMocks();
    dataClient = new PrivilegeMonitoringDataClient(deps);
    indexSyncService = createIndexSyncService(dataClient);
  });

  describe('syncAllIndexUsers', () => {
    it('should sync all index users successfully', async () => {
      const mockMonitoringSOSources = [
        { name: 'source1', indexPattern: 'index1' },
        { name: 'source2', indexPattern: 'index2' },
      ];
      mockFindByIndex.mockResolvedValue(mockMonitoringSOSources);

      indexSyncService._syncUsernamesFromIndex = jest.fn().mockResolvedValue(['user1', 'user2']);
      await indexSyncService.plainIndexSync(mockSavedObjectClient);
      expect(mockFindByIndex).toHaveBeenCalled();
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledTimes(2);
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledWith(
        expect.objectContaining({ indexName: 'index1' })
      );
    });

    it('should respect user limits and skip sync but maintain stale user detection', async () => {
      // Create a service with user limit
      const indexSyncServiceWithLimit = createIndexSyncService(dataClient, 100);

      // Mock current user count to be at limit
      esClientMock.count.mockResolvedValue({
        count: 100,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      const mockMonitoringSOSources = [{ name: 'source1', indexPattern: 'index1', id: 'source-1' }];
      mockFindByIndex.mockResolvedValue(mockMonitoringSOSources);

      // Mock current users in the monitoring source
      mockSearchUsernamesInIndex.mockResolvedValue({
        hits: {
          hits: [
            { _source: { user: { name: 'current_user_1' } } },
            { _source: { user: { name: 'current_user_2' } } },
          ],
        },
      });

      // Mock stale user detection - simulate finding 1 stale user
      const mockStaleUsers = [
        { username: 'stale_user_1', existingUserId: 'stale-id-1', sourceId: 'source-1' },
      ];
      mockFindStaleUsersForIndex.mockResolvedValue(mockStaleUsers);

      await indexSyncServiceWithLimit.plainIndexSync(mockSavedObjectClient);

      // Should search for current users in the source for stale detection
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          indexName: 'index1',
          batchSize: 1000,
        })
      );

      // Should perform stale user detection with current users from source
      expect(mockFindStaleUsersForIndex).toHaveBeenCalledWith('source-1', [
        'current_user_1',
        'current_user_2',
      ]);

      // Should log appropriate messages
      expect(deps.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'User limit reached (100/100). Skipping user sync but continuing with maintenance tasks.'
        )
      );
      expect(deps.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Skipping user sync for index1 due to user limit')
      );
      expect(deps.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Found 2 current users in source index1, identified 1 stale users')
      );
    });

    it('should proceed with sync when under user limit', async () => {
      // Create a service with user limit
      const indexSyncServiceWithLimit = createIndexSyncService(dataClient, 100);

      // Mock current user count to be under limit
      esClientMock.count.mockResolvedValue({
        count: 50,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      const mockMonitoringSOSources = [{ name: 'source1', indexPattern: 'index1' }];
      mockFindByIndex.mockResolvedValue(mockMonitoringSOSources);
      mockFindStaleUsersForIndex.mockResolvedValue([]);

      await indexSyncServiceWithLimit.plainIndexSync(mockSavedObjectClient);

      // Should proceed with sync operations
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledTimes(1);
      expect(deps.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting index sync. Current users: 50/100')
      );
    });

    it('should proceed normally when no user limit is set', async () => {
      // Use default service without limit
      const mockMonitoringSOSources = [{ name: 'source1', indexPattern: 'index1' }];
      mockFindByIndex.mockResolvedValue(mockMonitoringSOSources);
      mockFindStaleUsersForIndex.mockResolvedValue([]);

      await indexSyncService.plainIndexSync(mockSavedObjectClient);

      // Should not check user count when no limit is set
      expect(esClientMock.count).not.toHaveBeenCalled();
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed sources: some under limit, some at limit', async () => {
      // Create a service with user limit
      const indexSyncServiceWithLimit = createIndexSyncService(dataClient, 100);

      // Mock current user count at limit
      esClientMock.count.mockResolvedValue({
        count: 100,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      const mockMonitoringSOSources = [
        { name: 'source1', indexPattern: 'index1', id: 'source-1' },
        { name: 'source2', indexPattern: 'index2', id: 'source-2' },
      ];
      mockFindByIndex.mockResolvedValue(mockMonitoringSOSources);

      // Mock responses for both sources
      mockSearchUsernamesInIndex
        .mockResolvedValueOnce({
          hits: { hits: [{ _source: { user: { name: 'user1' } } }] },
        })
        .mockResolvedValueOnce({
          hits: { hits: [{ _source: { user: { name: 'user2' } } }] },
        });

      mockFindStaleUsersForIndex
        .mockResolvedValueOnce([
          { username: 'stale1', existingUserId: 'id1', sourceId: 'source-1' },
        ])
        .mockResolvedValueOnce([]);

      await indexSyncServiceWithLimit.plainIndexSync(mockSavedObjectClient);

      // Both sources should be processed for stale detection
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledTimes(2);
      expect(mockFindStaleUsersForIndex).toHaveBeenCalledTimes(2);
      expect(mockFindStaleUsersForIndex).toHaveBeenNthCalledWith(1, 'source-1', ['user1']);
      expect(mockFindStaleUsersForIndex).toHaveBeenNthCalledWith(2, 'source-2', ['user2']);
    });

    it('should handle empty monitoring sources when at limit', async () => {
      const indexSyncServiceWithLimit = createIndexSyncService(dataClient, 100);

      esClientMock.count.mockResolvedValue({
        count: 100,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      const mockMonitoringSOSources = [
        { name: 'empty_source', indexPattern: 'empty-index', id: 'empty-source' },
      ];
      mockFindByIndex.mockResolvedValue(mockMonitoringSOSources);

      // Mock empty response from monitoring source
      mockSearchUsernamesInIndex.mockResolvedValue({
        hits: { hits: [] },
      });

      // All previously synced users should be detected as stale
      const mockStaleUsers = [
        { username: 'old_user_1', existingUserId: 'old-1', sourceId: 'empty-source' },
        { username: 'old_user_2', existingUserId: 'old-2', sourceId: 'empty-source' },
      ];
      mockFindStaleUsersForIndex.mockResolvedValue(mockStaleUsers);

      await indexSyncServiceWithLimit.plainIndexSync(mockSavedObjectClient);

      expect(mockFindStaleUsersForIndex).toHaveBeenCalledWith('empty-source', []);
      expect(deps.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          'Found 0 current users in source empty-index, identified 2 stale users'
        )
      );
    });

    it('should handle source with KQL filter when at limit', async () => {
      const indexSyncServiceWithLimit = createIndexSyncService(dataClient, 100);

      esClientMock.count.mockResolvedValue({
        count: 100,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      const mockMonitoringSOSources = [
        {
          name: 'filtered_source',
          indexPattern: 'filtered-index',
          id: 'filtered-source',
          filter: { kuery: 'event.action: "login"' },
        },
      ];
      mockFindByIndex.mockResolvedValue(mockMonitoringSOSources);

      mockSearchUsernamesInIndex.mockResolvedValue({
        hits: { hits: [{ _source: { user: { name: 'filtered_user' } } }] },
      });
      mockFindStaleUsersForIndex.mockResolvedValue([]);

      await indexSyncServiceWithLimit.plainIndexSync(mockSavedObjectClient);

      // Should call with the KQL filter converted to Elasticsearch query
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          indexName: 'filtered-index',
          query: expect.any(Object), // Should be the converted KQL query
        })
      );
    });

    it('should handle index not found errors when at limit', async () => {
      const indexSyncServiceWithLimit = createIndexSyncService(dataClient, 100);

      esClientMock.count.mockResolvedValue({
        count: 100,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      const mockMonitoringSOSources = [
        { name: 'missing_source', indexPattern: 'missing-index', id: 'missing-source' },
      ];
      mockFindByIndex.mockResolvedValue(mockMonitoringSOSources);

      // Mock index not found error
      const indexNotFoundError = {
        meta: { body: { error: { type: 'index_not_found_exception' } } },
        message: 'index_not_found_exception',
      };
      mockSearchUsernamesInIndex.mockRejectedValue(indexNotFoundError);

      await indexSyncServiceWithLimit.plainIndexSync(mockSavedObjectClient);

      expect(deps.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Index "missing-index" not found — skipping.')
      );
      expect(mockFindStaleUsersForIndex).not.toHaveBeenCalled();
    });

    it('should perform stale user cleanup when at limit', async () => {
      const indexSyncServiceWithLimit = createIndexSyncService(dataClient, 100);

      esClientMock.count.mockResolvedValue({
        count: 100,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      const mockMonitoringSOSources = [{ name: 'source1', indexPattern: 'index1', id: 'source-1' }];
      mockFindByIndex.mockResolvedValue(mockMonitoringSOSources);

      mockSearchUsernamesInIndex.mockResolvedValue({
        hits: { hits: [{ _source: { user: { name: 'current_user' } } }] },
      });

      // Mock stale users found
      const mockStaleUsers = [
        { username: 'stale_user_1', existingUserId: 'stale-1', sourceId: 'source-1' },
        { username: 'stale_user_2', existingUserId: 'stale-2', sourceId: 'source-1' },
      ];
      mockFindStaleUsersForIndex.mockResolvedValue(mockStaleUsers);

      // Mock bulk utils service
      const mockBulkSoftDeleteOperations = jest
        .fn()
        .mockReturnValue([
          { update: { _id: 'stale-1', body: { doc: { 'user.is_privileged': false } } } },
          { update: { _id: 'stale-2', body: { doc: { 'user.is_privileged': false } } } },
        ]);

      // Mock successful bulk response
      esClientMock.bulk.mockResolvedValue({
        took: 1,
        errors: false,
        items: [
          { update: { _id: 'stale-1', _index: 'test-index', status: 200, result: 'updated' } },
          { update: { _id: 'stale-2', _index: 'test-index', status: 200, result: 'updated' } },
        ],
      });

      // We need to mock the bulk utils service
      const mockBulkUtilsService = {
        bulkSoftDeleteOperations: mockBulkSoftDeleteOperations,
      };

      // Mock the service creation
      jest.doMock('../bulk', () => ({
        createBulkUtilsService: () => mockBulkUtilsService,
      }));

      await indexSyncServiceWithLimit.plainIndexSync(mockSavedObjectClient);

      // Verify stale user cleanup was attempted
      expect(deps.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Found 2 stale users across all index sources.')
      );
    });

    it('should behave differently when under vs at limit', async () => {
      const mockMonitoringSOSources = [{ name: 'source1', indexPattern: 'index1', id: 'source-1' }];

      // Test 1: Under limit - should perform full sync
      mockFindByIndex.mockResolvedValue(mockMonitoringSOSources);
      const indexSyncServiceWithLimit1 = createIndexSyncService(dataClient, 100);
      esClientMock.count.mockResolvedValueOnce({
        count: 50,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      mockFindStaleUsersForIndex.mockResolvedValueOnce([]);

      await indexSyncServiceWithLimit1.plainIndexSync(mockSavedObjectClient);

      // When under limit, should log info about starting sync
      expect(deps.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting index sync. Current users: 50/100')
      );

      // Should NOT have warning about skipping sync
      expect(deps.logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('User limit reached')
      );

      // Reset mocks
      jest.clearAllMocks();
      mockFindByIndex.mockResolvedValue(mockMonitoringSOSources);

      // Test 2: At limit - should skip sync but do stale detection
      const indexSyncServiceWithLimit2 = createIndexSyncService(dataClient, 100);
      esClientMock.count.mockResolvedValueOnce({
        count: 100,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });

      mockSearchUsernamesInIndex.mockResolvedValue({
        hits: { hits: [{ _source: { user: { name: 'user1' } } }] },
      });
      mockFindStaleUsersForIndex.mockResolvedValueOnce([]);

      await indexSyncServiceWithLimit2.plainIndexSync(mockSavedObjectClient);

      // When at limit, should log warning about skipping sync
      expect(deps.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'User limit reached (100/100). Skipping user sync but continuing with maintenance tasks.'
        )
      );

      // Should perform search for stale detection
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          indexName: 'index1',
          batchSize: 1000,
        })
      );

      // Should perform stale user detection
      expect(mockFindStaleUsersForIndex).toHaveBeenCalledWith('source-1', ['user1']);

      // Should log debug about skipping sync but doing stale detection
      expect(deps.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Skipping user sync for index1 due to user limit')
      );
    });

    it('logs and returns if no index sources', async () => {
      mockFindByIndex.mockResolvedValue([]);
      await indexSyncService.plainIndexSync(mockSavedObjectClient);
      expect(deps.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('No monitoring index sources found. Skipping sync.')
      );
    });

    it('skips sources without indexPattern', async () => {
      mockFindByIndex.mockResolvedValue([
        { name: 'no-index', indexPattern: undefined },
        { name: 'with-index', indexPattern: 'foo' },
      ]);
      mockFindStaleUsersForIndex.mockResolvedValue([]);

      await indexSyncService.plainIndexSync(mockSavedObjectClient);
      // Should only be called for the source with indexPattern
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledTimes(1);
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledWith(
        expect.objectContaining({ indexName: 'foo' })
      );
    });

    it('should retrieve all usernames from index and perform bulk ops', async () => {
      const mockHits = [
        {
          _source: { user: { name: 'frodo' } },
          _id: '1',
          sort: [1],
        },
        {
          _source: { user: { name: 'samwise' } },
          _id: '2',
          sort: [2],
        },
      ];

      const mockMonitoredUserHits = {
        hits: {
          hits: [
            {
              _source: { user: { name: 'frodo' } },
              _id: '1',
            },
            {
              _source: { user: { name: 'samwise' } },
              _id: '2',
            },
          ],
        },
      };

      mockSearchUsernamesInIndex
        .mockResolvedValueOnce({ hits: { hits: mockHits } }) // first batch
        .mockResolvedValueOnce({ hits: { hits: [] } }); // second batch = end

      mockGetMonitoredUsers.mockResolvedValue(mockMonitoredUserHits);

      mockBulkUpsertOperations.mockReturnValue([{ index: { _id: '1' } }]);
      dataClient.index = 'test-index';

      const usernames = await indexSyncService._syncUsernamesFromIndex({
        indexName: 'test-index',
        sourceId: 'source-id',
      });

      expect(usernames).toEqual(['frodo', 'samwise']);
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledTimes(2);
      expect(esClientMock.bulk).toHaveBeenCalled();
      expect(mockGetMonitoredUsers).toHaveBeenCalledWith(['frodo', 'samwise']);
      expect(mockBulkUpsertOperations).toHaveBeenCalled();
    });

    it('should log errors when the bulk upload response contains errors', async () => {
      const errorMsg = 'Bulk operation failed';
      const mockHits = [
        {
          _source: { user: { name: 'frodo' } },
          _id: '1',
          sort: [1],
        },
      ];

      mockSearchUsernamesInIndex
        .mockResolvedValueOnce({ hits: { hits: mockHits } }) // first batch
        .mockResolvedValueOnce({ hits: { hits: [] } }); // second batch = end
      mockGetMonitoredUsers.mockResolvedValue({
        hits: {
          hits: [],
        },
      });
      mockBulkUpsertOperations.mockReturnValue([{ index: { _id: '1' } }]);
      esClientMock.bulk.mockResolvedValue({
        errors: true,
        items: [{ index: { error: { errorMsg } } }],
      } as unknown as BulkResponse);

      await indexSyncService._syncUsernamesFromIndex({
        indexName: 'test-index',
        sourceId: 'source-id',
      });

      expect(deps.logger.error).toHaveBeenCalledWith(expect.stringContaining(errorMsg));
    });
  });
});
