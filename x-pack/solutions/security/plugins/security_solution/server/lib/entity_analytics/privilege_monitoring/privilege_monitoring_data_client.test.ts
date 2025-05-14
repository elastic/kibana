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

jest.mock('./tasks/privilege_monitoring_task', () => {
  return {
    startPrivilegeMonitoringTask: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('./saved_object/privilege_monitoring', () => {
  return {
    PrivilegeMonitoringEngineDescriptorClient: jest.fn().mockImplementation(() => ({
      init: jest.fn().mockResolvedValue({ status: 'success' }),
      update: jest.fn(),
    })),
  };
});
describe('Privilege Monitoring Data Client', () => {
  const mockSavedObjectClient = savedObjectsClientMock.create();
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
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
      expect(loggerMock.debug).toHaveBeenCalledTimes(1);
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

  describe('audit', () => {
    it('should log audit events successfully', async () => {
      // TODO: implement once we have more auditing
    });

    it('should handle errors during audit logging', async () => {
      // TODO: implement once we have more auditing
    });
  });
});
