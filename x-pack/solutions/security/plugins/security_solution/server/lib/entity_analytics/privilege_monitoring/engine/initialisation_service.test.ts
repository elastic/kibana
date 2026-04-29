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
import type { AuditLogger } from '@kbn/core/server';
import { PrivilegeMonitoringDataClient } from './data_client';
import type { PrivilegeMonitoringGlobalDependencies } from './data_client';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { InitialisationService } from './initialisation_service';
import { createInitialisationService } from './initialisation_service';
import { MonitoringEngineComponentResourceEnum } from '../../../../../common/api/entity_analytics';
import { PrivilegeMonitoringEngineActions } from '../auditing/actions';
import { allowedExperimentalValues } from '../../../../../common';

const mockUpsertSources = jest.fn();
jest.mock('./initialisation_sources_service', () => {
  return {
    createInitialisationSourcesService: () => () => mockUpsertSources(),
  };
});

const mockStartPrivilegeMonitoringTask = jest.fn();
jest.mock('../tasks/privilege_monitoring_task', () => {
  return {
    startPrivilegeMonitoringTask: () => mockStartPrivilegeMonitoringTask(),
    removePrivilegeMonitoringTask: jest.fn().mockResolvedValue(undefined),
  };
});

const mockEngineDescriptorInit = jest.fn();
const mockFind = jest.fn().mockResolvedValue({
  saved_objects: [],
  total: 0,
});
jest.mock('../saved_objects', () => {
  return {
    MonitoringEntitySourceDescriptorClient: jest.fn().mockImplementation(() => ({
      findByIndex: jest.fn(),
      create: jest.fn(),
      find: mockFind,
    })),
    PrivilegeMonitoringEngineDescriptorClient: jest.fn().mockImplementation(() => ({
      init: mockEngineDescriptorInit,
      update: jest.fn(),
    })),
  };
});

describe('Privileged User Monitoring: Index Sync Service', () => {
  const mockSavedObjectClient = savedObjectsClientMock.create();
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
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
    experimentalFeatures: allowedExperimentalValues,
  };

  let initService: InitialisationService;
  let dataClient: PrivilegeMonitoringDataClient;

  beforeEach(() => {
    jest.clearAllMocks();
    dataClient = new PrivilegeMonitoringDataClient(deps);
    initService = createInitialisationService(dataClient, mockSavedObjectClient);
  });
  describe('init', () => {
    it('should throw if taskManager is not available', async () => {
      const { taskManager, ...optsWithoutTaskManager } = deps;
      dataClient = new PrivilegeMonitoringDataClient(optsWithoutTaskManager);

      expect(() => createInitialisationService(dataClient, mockSavedObjectClient)).toThrow(
        'Task Manager is not available'
      );
    });

    it('should initialize the privilege monitoring engine successfully', async () => {
      mockUpsertSources.mockResolvedValue(undefined);
      mockEngineDescriptorInit.mockResolvedValue({ status: 'success' });

      const result = await initService.init();

      expect(mockUpsertSources).toHaveBeenCalled();
      expect(mockStartPrivilegeMonitoringTask).toHaveBeenCalled();
      expect(auditMock.log).toHaveBeenCalled();
      expect(result).toEqual({ status: 'success' });
    });

    it('should handle unexpected errors and update engine status', async () => {
      const fakeError = new Error('Something went wrong');
      mockUpsertSources.mockRejectedValue(fakeError);

      const mockAudit = jest.fn();
      const mockLog = jest.fn();

      dataClient.audit = mockAudit;
      dataClient.log = mockLog;

      await initService.init();

      expect(mockLog).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Error initializing privilege monitoring engine')
      );

      expect(mockAudit).toHaveBeenCalledWith(
        PrivilegeMonitoringEngineActions.INIT,
        MonitoringEngineComponentResourceEnum.privmon_engine,
        'Failed to initialize privilege monitoring engine',
        expect.any(Error)
      );
    });
  });
});
