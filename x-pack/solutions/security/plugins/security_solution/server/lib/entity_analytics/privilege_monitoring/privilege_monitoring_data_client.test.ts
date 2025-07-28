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

  describe('syncAllIndexUsers', () => {
    const mockLog = jest.fn();

    it('should sync all index users successfully', async () => {
      const mockMonitoringSOSources = [
        { name: 'source1', indexPattern: 'index1' },
        { name: 'source2', indexPattern: 'index2' },
      ];
      const findByIndexMock = jest.fn().mockResolvedValue(mockMonitoringSOSources);
      Object.defineProperty(dataClient, 'monitoringIndexSourceClient', {
        value: {
          init: jest.fn().mockResolvedValue({ status: 'success' }),
          update: jest.fn(),
          findByIndex: findByIndexMock,
        },
      });
      dataClient.syncUsernamesFromIndex = jest.fn().mockResolvedValue(['user1', 'user2']);
      await dataClient.plainIndexSync();
      expect(findByIndexMock).toHaveBeenCalled();
      expect(dataClient.syncUsernamesFromIndex).toHaveBeenCalledTimes(2);
      expect(dataClient.syncUsernamesFromIndex).toHaveBeenCalledWith({
        indexName: 'index1',
        kuery: undefined,
      });
    });

    it('logs and returns if no index sources', async () => {
      Object.defineProperty(dataClient, 'log', { value: mockLog });
      const findByIndexMock = jest.fn().mockResolvedValue([]);
      Object.defineProperty(dataClient, 'monitoringIndexSourceClient', {
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

    it('skips sources without indexPattern', async () => {
      Object.defineProperty(dataClient, 'monitoringIndexSourceClient', {
        value: {
          findByIndex: jest.fn().mockResolvedValue([
            { name: 'no-index', indexPattern: undefined },
            { name: 'with-index', indexPattern: 'foo' },
          ]),
          init: jest.fn().mockResolvedValue({ status: 'success' }),
          update: jest.fn(),
        },
      });

      dataClient.syncUsernamesFromIndex = jest.fn().mockResolvedValue(['user1']);
      Object.defineProperty(dataClient, 'findStaleUsersForIndex', {
        value: jest.fn().mockResolvedValue([]),
      });
      await dataClient.plainIndexSync();
      // Should only be called for the source with indexPattern
      expect(dataClient.syncUsernamesFromIndex).toHaveBeenCalledTimes(1);
      expect(dataClient.syncUsernamesFromIndex).toHaveBeenCalledWith({
        indexName: 'foo',
        kuery: undefined,
      });
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

      dataClient.searchUsernamesInIndex = jest
        .fn()
        .mockResolvedValueOnce({ hits: { hits: mockHits } }) // first batch
        .mockResolvedValueOnce({ hits: { hits: [] } }); // second batch = end

      dataClient.getMonitoredUsers = jest.fn().mockResolvedValue(mockMonitoredUserHits);
      dataClient.buildBulkOperationsForUsers = jest.fn().mockReturnValue([{ index: { _id: '1' } }]);
      dataClient.getIndex = jest.fn().mockReturnValue('test-index');

      const usernames = await dataClient.syncUsernamesFromIndex({
        indexName: 'test-index',
      });

      expect(usernames).toEqual(['frodo', 'samwise']);
      expect(dataClient.searchUsernamesInIndex).toHaveBeenCalledTimes(2);
      expect(esClientMock.bulk).toHaveBeenCalled();
      expect(dataClient.getMonitoredUsers).toHaveBeenCalledWith(['frodo', 'samwise']);
      expect(dataClient.buildBulkOperationsForUsers).toHaveBeenCalled();
    });
  });
});
