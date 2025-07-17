/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { PrivilegeMonitoringDataClient } from './privilege_monitoring_data_client';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server/plugin';
import { PrivilegeMonitoringEngineActions } from './auditing/actions';
import { EngineComponentResourceEnum } from '../../../../common/api/entity_analytics/privilege_monitoring/common.gen';

import { startPrivilegeMonitoringTask as mockStartPrivilegeMonitoringTask } from './tasks/privilege_monitoring_task';
import type { AuditLogger } from '@kbn/core/server';
import { createEsSearchResponse, createMockUsers, withMockLog } from './test_helpers';
import {
  eventIngestPipeline,
  PRIVMON_EVENT_INGEST_PIPELINE_ID,
} from './elasticsearch/pipelines/event_ingested';

jest.mock('./tasks/privilege_monitoring_task', () => {
  return {
    startPrivilegeMonitoringTask: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('./saved_objects', () => {
  return {
    MonitoringEntitySourceDescriptorClient: jest.fn().mockImplementation(() => ({
      findByIndex: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    })),
    PrivilegeMonitoringEngineDescriptorClient: jest.fn().mockImplementation(() => ({
      init: jest.fn().mockResolvedValue({ status: 'success' }),
      update: jest.fn(),
    })),
  };
});

describe('Privilege Monitoring Data Client', () => {
  const mockSavedObjectClient = savedObjectsClientMock.create();
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
  const esClientMock = clusterClientMock.asCurrentUser;
  const loggerMock = loggingSystemMock.createLogger();
  const auditMock = { log: jest.fn().mockReturnValue(undefined) };
  loggerMock.debug = jest.fn();

  const defaultOpts = {
    logger: loggerMock,
    clusterClient: clusterClientMock,
    namespace: 'default',
    soClient: mockSavedObjectClient,
    kibanaVersion: '8.0.0',
    taskManager: {} as TaskManagerStartContract,
    auditLogger: auditMock as unknown as AuditLogger,
  };

  let dataClient: PrivilegeMonitoringDataClient;
  const mockDescriptor = { status: 'success' };
  const mockCreateOrUpdateIndex = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();

    dataClient = new PrivilegeMonitoringDataClient(defaultOpts);
  });

  describe('init', () => {
    it('should initialize the privilege monitoring engine successfully', async () => {
      dataClient.createOrUpdateIndex = mockCreateOrUpdateIndex;
      const result = await dataClient.init();

      expect(mockCreateOrUpdateIndex).toHaveBeenCalled();
      expect(mockStartPrivilegeMonitoringTask).toHaveBeenCalled();
      expect(auditMock.log).toHaveBeenCalled();
      expect(result).toEqual(mockDescriptor);
    });

    it('should throw if taskManager is not available', async () => {
      const { taskManager, ...optsWithoutTaskManager } = defaultOpts;
      dataClient = new PrivilegeMonitoringDataClient(optsWithoutTaskManager);
      await expect(dataClient.init()).rejects.toThrow('Task Manager is not available');
    });

    it('should log a message if index already exists', async () => {
      const error = {
        meta: {
          body: {
            error: {
              type: 'resource_already_exists_exception',
            },
          },
        },
      };

      dataClient.createOrUpdateIndex = jest.fn().mockRejectedValue(error);

      Object.defineProperty(dataClient, 'engineClient', {
        value: {
          init: jest.fn().mockResolvedValue({ status: 'success' }),
          update: jest.fn(),
        },
      });

      await dataClient.init();

      expect(loggerMock.info).toHaveBeenCalledWith('Privilege monitoring index already exists');
    });

    it('should handle unexpected errors and update engine status', async () => {
      const fakeError = new Error('Something went wrong');
      dataClient.createOrUpdateIndex = jest.fn().mockRejectedValue(fakeError);

      const mockAudit = jest.fn();
      const mockLog = jest.fn();

      Object.defineProperty(dataClient, 'audit', { value: mockAudit });
      Object.defineProperty(dataClient, 'log', { value: mockLog });

      await dataClient.init();

      expect(mockLog).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Error initializing privilege monitoring engine')
      );

      expect(mockAudit).toHaveBeenCalledWith(
        PrivilegeMonitoringEngineActions.INIT,
        EngineComponentResourceEnum.privmon_engine,
        'Failed to initialize privilege monitoring engine',
        expect.any(Error)
      );
    });
  });

  describe('createIngestPipelineIfDoesNotExist', () => {
    it('should simply log a message if the pipeline already exists', async () => {
      const mockLog = jest.fn();
      Object.defineProperty(dataClient, 'log', { value: mockLog });

      const mockGetPipeline = jest.fn().mockResolvedValue({
        [PRIVMON_EVENT_INGEST_PIPELINE_ID]: {},
      });
      Object.defineProperty(dataClient, 'internalUserClient', {
        value: {
          ingest: {
            getPipeline: mockGetPipeline,
          },
        },
      });

      await dataClient.createIngestPipelineIfDoesNotExist();

      expect(mockGetPipeline).toHaveBeenCalled();

      expect(mockLog).toHaveBeenCalledWith(
        'info',
        'Privileged user monitoring ingest pipeline already exists.'
      );
    });

    it('should only create a pipeline if no existing pipeline exists', async () => {
      const mockLog = jest.fn();
      Object.defineProperty(dataClient, 'log', { value: mockLog });

      const mockGetPipeline = jest.fn().mockResolvedValue({});
      const mockPutPipeline = jest.fn();

      Object.defineProperty(dataClient, 'internalUserClient', {
        value: {
          ingest: {
            getPipeline: mockGetPipeline,
            putPipeline: mockPutPipeline,
          },
        },
      });

      await dataClient.createIngestPipelineIfDoesNotExist();

      expect(mockPutPipeline).toHaveBeenCalledWith(expect.objectContaining(eventIngestPipeline));

      expect(mockLog).toHaveBeenCalledWith(
        'info',
        expect.stringContaining(
          'Privileged user monitoring ingest pipeline does not exist, creating.'
        )
      );
    });
  });

  describe('audit', () => {
    it('should log audit events successfully', async () => {
      // TODO: implement once we have more auditing
    });

    it('should handle errors during audit logging', async () => {
      // TODO: implement once we have more auditing
    });
  });

  // Below are the tests for the plainIndexSync function and its related functions.
  describe('plainIndexSync', () => {
    let mockLog: jest.Mock;
    beforeEach(() => {
      mockLog = withMockLog(dataClient);
    });
    it('should sync all usernames from index sources and bulk delete any stale users', async () => {
      const mockMonitoringSOSources = [
        { type: 'index', name: 'source1', indexPattern: 'index1' },
        { type: 'index', name: 'source2', indexPattern: 'index2' },
      ];
      const findByIndexMock = jest.fn().mockResolvedValue(mockMonitoringSOSources);
      Object.defineProperty(dataClient, 'monitoringIndexSourceClient', {
        value: {
          init: jest.fn().mockResolvedValue({ status: 'success' }),
          update: jest.fn(),
          findByIndex: findByIndexMock,
        },
      });
      dataClient.ingestUsersFromIndexSource = jest.fn().mockResolvedValue(['source1', 'source2']);
      dataClient.findStaleUsersForIndex = jest.fn().mockResolvedValue(['source1']);
      dataClient.bulkDeleteStaleUsers = jest.fn().mockResolvedValue('source1');
      await dataClient.plainIndexSync();
      expect(findByIndexMock).toHaveBeenCalled();
      expect(mockLog).not.toHaveBeenCalledWith(
        'debug',
        'No monitoring index sources found. Skipping sync.'
      );
      expect(dataClient.ingestUsersFromIndexSource).toHaveBeenCalledTimes(2);
      expect(dataClient.findStaleUsersForIndex).toHaveBeenCalledTimes(2);
      expect(dataClient.bulkDeleteStaleUsers).toHaveBeenCalledTimes(1);
    });

    it('should log and returns if no index sources', async () => {
      Object.defineProperty(dataClient, 'log', { value: mockLog });
      const findByIndexMock = jest.fn().mockResolvedValue([]);
      Object.defineProperty(dataClient, 'monitoringIndexSourceClient', {
        // TODO: de-duplicate this across tests
        value: {
          init: jest.fn().mockResolvedValue({ status: 'success' }),
          update: jest.fn(),
          findByIndex: findByIndexMock,
        },
      });

      await dataClient.plainIndexSync();

      expect(mockLog).toHaveBeenCalledWith(
        'debug',
        expect.stringContaining('No monitoring index sources found. Skipping sync.')
      );
    });

    it('should skip sources without indexPattern', async () => {
      Object.defineProperty(dataClient, 'monitoringIndexSourceClient', {
        value: {
          findByIndex: jest.fn().mockResolvedValue([{ name: 'no-index', type: 'index' }]),
          init: jest.fn().mockResolvedValue({ status: 'success' }),
          update: jest.fn(),
        },
      });
      Object.defineProperty(dataClient, 'log', { value: mockLog });
      dataClient.ingestUsersFromIndexSource = jest.fn().mockResolvedValue(['no-index']);
      await dataClient.plainIndexSync();
      expect(mockLog).toHaveBeenCalledWith(
        'debug',
        'Skipping source "no-index" with no index pattern.'
      );
    });
  });

  describe('ingestUsersFromIndexSource', () => {
    let mockLog: jest.Mock;
    beforeEach(() => {
      mockLog = withMockLog(dataClient);
    });
    it('should return usernames from the index source', async () => {
      dataClient.fetchUsernamesFromIndex = jest.fn().mockResolvedValue(['username1', 'username2']);
      dataClient.bulkUpsertMonitoredUsers = jest.fn().mockResolvedValue(['username1', 'username2']);
      dataClient.createOrUpdateIndex = jest.fn().mockResolvedValue(['username1', 'username2']);
      const index: string = 'index1';
      const mockSource = { type: 'index', name: 'username1', indexPattern: index };
      const result = await dataClient.ingestUsersFromIndexSource(mockSource, index);
      expect(result).toEqual(['username1', 'username2']);
    });

    it('should handle index not found error gracefully', async () => {
      const indexNotFoundMockError = {
        meta: {
          body: {
            error: {
              type: 'index_not_found_exception',
            },
          },
        },
      };
      dataClient.fetchUsernamesFromIndex = jest.fn().mockRejectedValue(indexNotFoundMockError);
      await dataClient.ingestUsersFromIndexSource(
        { type: 'index', name: 'source1', indexPattern: 'index1' },
        'index1'
      );
      expect(mockLog).toHaveBeenCalledWith('warn', `Index "index1" not found — skipping.`);
    });
    it('should handle errors during user ingestion', async () => {
      const genericErrorMock = new Error('generic_error');

      dataClient.fetchUsernamesFromIndex = jest.fn().mockRejectedValue(genericErrorMock);
      await dataClient.ingestUsersFromIndexSource(
        { type: 'index', name: 'source1', indexPattern: 'index1' },
        'index1'
      );
      expect(mockLog).toHaveBeenCalledWith(
        'error',
        'Unexpected error during sync for index "index1": generic_error'
      );
    });
  });

  describe('findStaleUsersForIndex', () => {
    it('should return stale users for a given index', async () => {
      const esClientResponse = createEsSearchResponse([
        {
          _id: 'abc123',
          _index: 'index1',
          _source: {
            user: { name: 'alice' },
            labels: { source_indices: ['index1'] },
          },
        },
      ]);
      esClientMock.search.mockResolvedValue(esClientResponse);
      const expectedBulkUsernames = [
        {
          username: 'alice',
          existingUserId: 'abc123',
          indexName: 'index1',
        },
      ];
      const result = await dataClient.findStaleUsersForIndex('index1', ['bob']);
      expect(result).toEqual(expectedBulkUsernames);
    });
    it('should use "unknown" as username if user.name is missing', async () => {
      const esClientResponse = createEsSearchResponse([
        {
          _id: 'abc123',
          _index: 'index1',
          _source: {
            user: {},
            labels: { source_indices: ['index1'] },
          },
        },
      ]);

      esClientMock.search.mockResolvedValue(esClientResponse);
      const result = await dataClient.findStaleUsersForIndex('index1', ['bob']);

      expect(result).toEqual([
        {
          username: 'unknown',
          existingUserId: 'abc123',
          indexName: 'index1',
        },
      ]);
    });
  });
  describe('bulkUpsertMonitoredUsers', () => {
    let mockLog: jest.Mock;
    beforeEach(() => {
      mockLog = withMockLog(dataClient);
    });
    it('should bulk upsert monitored users', async () => {
      const mockUsernames = ['alice', 'bob'];
      dataClient.getMonitoredUsers = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'id-alice',
              _source: { user: { name: 'alice' } },
            },
            {
              _id: 'id-bob',
              _source: { user: { name: 'bob' } },
            },
          ],
        },
      });
      const result = await dataClient.bulkUpsertMonitoredUsers({
        usernames: mockUsernames,
        indexName: 'privilege_monitoring_users',
      });
      expect(result).toEqual(mockUsernames);
      expect(esClientMock.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        body: expect.arrayContaining([
          {
            update: {
              _index: '.entity_analytics.monitoring.users-default',
              _id: 'id-alice',
            },
          },
          {
            script: {
              source: expect.stringContaining('if (!ctx._source.labels.source_indices.contains'),
              params: {
                index: 'privilege_monitoring_users',
              },
            },
          },
          {
            update: {
              _index: '.entity_analytics.monitoring.users-default',
              _id: 'id-bob',
            },
          },
          {
            script: {
              source: expect.stringContaining('if (!ctx._source.labels.source_indices.contains'),
              params: {
                index: 'privilege_monitoring_users',
              },
            },
          },
        ]),
      });
    });

    it('should handle errors during bulk upsert', async () => {
      const mockError = new Error('Bulk upsert failed');
      dataClient.getMonitoredUsers = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'id-alice',
              _source: { user: { name: 'alice' } },
            },
          ],
        },
      });
      esClientMock.bulk.mockRejectedValue(mockError);

      const result = await dataClient.bulkUpsertMonitoredUsers({
        usernames: ['alice'],
        indexName: 'privilege_monitoring_users',
      });

      expect(result).toEqual(['alice']);

      expect(mockLog).toHaveBeenCalledWith('error', expect.stringContaining('Bulk upsert failed'));
    });

    it('should handle empty usernames gracefully', async () => {
      const result = await dataClient.bulkUpsertMonitoredUsers({
        usernames: [],
        indexName: 'privilege_monitoring_users',
      });
      expect(result).toEqual(null);
      expect(esClientMock.bulk).not.toHaveBeenCalled();
    });
  });
  describe('buildBulkOperationsForUsers', () => {
    it('should build bulk operations for updating users', () => {
      const mockUsers = [
        { username: 'alice', existingUserId: 'alice', indexName: 'privilege_monitoring_users' },
        { username: 'bob', existingUserId: 'bob', indexName: 'privilege_monitoring_users' },
      ];
      const result = dataClient.buildBulkOperationsForUsers(
        mockUsers,
        'privilege_monitoring_users'
      );
      expect(result).toEqual([
        {
          update: {
            _index: 'privilege_monitoring_users',
            _id: 'alice',
          },
        },
        {
          script: {
            source: expect.stringContaining('if (!ctx._source.labels.source_indices.contains'),
            params: {
              index: 'privilege_monitoring_users',
            },
          },
        },
        {
          update: {
            _index: 'privilege_monitoring_users',
            _id: 'bob',
          },
        },
        {
          script: {
            source: expect.stringContaining('if (!ctx._source.labels.source_indices.contains'),
            params: {
              index: 'privilege_monitoring_users',
            },
          },
        },
      ]);
    });
    it('should build bulk operations for new users', () => {
      const mockUsers = [
        { username: 'charlie', existingUserId: undefined, indexName: 'privilege_monitoring_users' },
      ];
      const result = dataClient.buildBulkOperationsForUsers(
        mockUsers,
        'privilege_monitoring_users'
      );
      expect(result).toEqual([
        {
          index: {
            _index: 'privilege_monitoring_users',
          },
        },
        {
          user: { is_privileged: true, name: 'charlie' },
          labels: {
            source_indices: ['privilege_monitoring_users'],
            sources: ['index'],
          },
        },
      ]);
    });
    it('should handle a mix of existing and new users', () => {
      const mockUsers = [
        { username: 'alice', existingUserId: 'id-alice', indexName: 'privilege_monitoring_users' },
        { username: 'bob', existingUserId: undefined, indexName: 'privilege_monitoring_users' },
      ];

      const result = dataClient.buildBulkOperationsForUsers(
        mockUsers,
        'privilege_monitoring_users'
      );

      expect(result).toEqual([
        {
          update: {
            _index: 'privilege_monitoring_users',
            _id: 'id-alice',
          },
        },
        {
          script: {
            source: expect.stringContaining('ctx._source.labels.source_indices'),
            params: { index: 'privilege_monitoring_users' },
          },
        },
        {
          index: {
            _index: 'privilege_monitoring_users',
          },
        },
        {
          user: { name: 'bob', is_privileged: true },
          labels: {
            sources: ['index'],
            source_indices: ['privilege_monitoring_users'],
          },
        },
      ]);
    });
    it('should return an empty array when given no users', () => {
      const result = dataClient.buildBulkOperationsForUsers([], 'privilege_monitoring_users');
      expect(result).toEqual([]);
    });
  });
  describe('bulkDeleteStaleUsers', () => {
    let mockLog: jest.Mock;
    beforeEach(() => {
      mockLog = withMockLog(dataClient);
    });
    it('should bulk delete stale users', async () => {
      const mockStaleUsers = createMockUsers([
        { username: 'alice', id: 'id-alice' },
        { username: 'bob', id: 'id-bob' },
      ]);

      const bulkOperationsForSoftDeleteUsersResult = [
        {
          update: {
            _index: '.entity_analytics.monitoring.users-default',
            _id: 'id-alice',
          },
        },
        {
          script: {
            source: expect.stringContaining('ctx._source.labels?.source_indices.removeIf'),
            params: {
              index: 'privilege_monitoring_users',
            },
          },
        },
        {
          update: {
            _index: '.entity_analytics.monitoring.users-default',
            _id: 'id-bob',
          },
        },
        {
          script: {
            source: expect.stringContaining('ctx._source.labels?.source_indices.removeIf'),
            params: {
              index: 'privilege_monitoring_users',
            },
          },
        },
      ];

      dataClient.bulkOperationsForSoftDeleteUsers = jest
        .fn()
        .mockReturnValue(bulkOperationsForSoftDeleteUsersResult);

      await dataClient.bulkDeleteStaleUsers(mockStaleUsers);

      expect(esClientMock.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        body: bulkOperationsForSoftDeleteUsersResult,
      });
    });
    it('should handle errors during bulk delete', async () => {
      const mockStaleUsers = createMockUsers([
        { username: 'alice', id: 'id-alice' },
        { username: 'bob', id: 'id-bob' },
      ]);
      const mockError = new Error('Bulk delete failed');
      dataClient.bulkOperationsForSoftDeleteUsers = jest.fn().mockReturnValue([
        {
          update: {
            _index: '.entity_analytics.monitoring.users-default',
            _id: 'id-alice',
          },
        },
        {
          script: {
            source: expect.stringContaining('ctx._source.labels?.source_indices.removeIf'),
            params: {
              index: 'privilege_monitoring_users',
            },
          },
        },
      ]);
      esClientMock.bulk.mockRejectedValue(mockError);

      await dataClient.bulkDeleteStaleUsers(mockStaleUsers);

      expect(mockLog).toHaveBeenCalledWith('error', expect.stringContaining('Bulk delete failed'));
    });
  });
});
