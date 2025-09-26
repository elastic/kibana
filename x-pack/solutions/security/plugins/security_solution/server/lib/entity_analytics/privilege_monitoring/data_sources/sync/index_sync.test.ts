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

const mockFindSourcesByType = jest.fn();
jest.mock('../../saved_objects', () => {
  return {
    MonitoringEntitySourceDescriptorClient: jest.fn().mockImplementation(() => ({
      findSourcesByType: () => mockFindSourcesByType(),
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
const mockGetExistingUsersMap = jest.fn();
jest.mock('../../users/search', () => {
  return {
    createSearchService: () => ({
      searchUsernamesInIndex: (obj: Parameters<SearchService['searchUsernamesInIndex']>[0]) =>
        mockSearchUsernamesInIndex(obj),
      getExistingUsersMap: (usernames: string[]) => mockGetExistingUsersMap(usernames),
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
      mockFindSourcesByType.mockResolvedValue(mockMonitoringSOSources);

      indexSyncService._syncUsernamesFromIndex = jest.fn().mockResolvedValue(['user1', 'user2']);
      await indexSyncService.plainIndexSync(mockSavedObjectClient);
      expect(mockFindSourcesByType).toHaveBeenCalled();
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledTimes(2);
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledWith(
        expect.objectContaining({ indexName: 'index1' })
      );
    });

    it('logs and returns if no index sources', async () => {
      mockFindSourcesByType.mockResolvedValue([]);
      await indexSyncService.plainIndexSync(mockSavedObjectClient);
      expect(deps.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('No monitoring index sources found. Skipping sync.')
      );
    });

    it('skips sources without indexPattern', async () => {
      mockFindSourcesByType.mockResolvedValue([
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
        { _source: { user: { name: 'frodo' } }, _id: '1', sort: [1] },
        { _source: { user: { name: 'samwise' } }, _id: '2', sort: [2] },
      ];

      // 1st call returns a page with hits, 2nd call returns empty page to stop
      mockSearchUsernamesInIndex
        .mockResolvedValueOnce({ hits: { hits: mockHits } })
        .mockResolvedValueOnce({ hits: { hits: [] } });

      const existingMap = new Map<string, string | undefined>([
        ['frodo', '1'],
        ['samwise', '2'],
      ]);
      mockGetExistingUsersMap.mockResolvedValue(existingMap);

      mockBulkUpsertOperations.mockReturnValue([{ index: { _id: '1' } }]);
      dataClient.index = 'test-index';

      const usernames = await indexSyncService._syncUsernamesFromIndex({
        indexName: 'test-index',
        sourceId: 'source-id',
      });

      expect(usernames).toEqual(['frodo', 'samwise']);
      expect(mockSearchUsernamesInIndex).toHaveBeenCalledTimes(2);
      expect(mockGetExistingUsersMap).toHaveBeenCalledWith(['frodo', 'samwise']); // UPDATED
      expect(mockBulkUpsertOperations).toHaveBeenCalled();
      expect(esClientMock.bulk).toHaveBeenCalled();
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
