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

import type { EngineStatusService } from './status_service';
import { createEngineStatusService } from './status_service';
import type { PrivilegeMonitoringEngineDescriptorClient } from '../saved_objects';
import type { MonitoringEngineDescriptor } from '../../../../../common/api/entity_analytics';

const mockRemovePrivilegeMonitoringTask = jest.fn();
const mockScheduleNow = jest.fn();
jest.mock('../tasks/privilege_monitoring_task', () => {
  return {
    removePrivilegeMonitoringTask: () => mockRemovePrivilegeMonitoringTask(),
    scheduleNow: () => mockScheduleNow(),
  };
});

const mockGetEngineDescriptor = jest.fn();
const mockUpdateStatusEngineDescriptor = jest.fn();
jest.mock('../saved_objects', () => {
  return {
    MonitoringEntitySourceDescriptorClient: jest.fn().mockImplementation(() => ({
      findByIndex: jest.fn(),
      create: jest.fn(),
    })),
    PrivilegeMonitoringEngineDescriptorClient: jest.fn().mockImplementation(() => ({
      get: mockGetEngineDescriptor,
      updateStatus: (
        status: Parameters<PrivilegeMonitoringEngineDescriptorClient['updateStatus']>[0]
      ) => mockUpdateStatusEngineDescriptor(status),
    })),
  };
});
describe('Privileged User Monitoring: Engine Status Service', () => {
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
  };

  let statusService: EngineStatusService;
  let dataClient: PrivilegeMonitoringDataClient;

  beforeEach(() => {
    jest.clearAllMocks();
    dataClient = new PrivilegeMonitoringDataClient(deps);
    statusService = createEngineStatusService(dataClient, mockSavedObjectClient);
  });
  describe('disable', () => {
    it('should not disable the privilege monitoring engine if it is not started', async () => {
      mockGetEngineDescriptor.mockResolvedValue({
        status: 'error',
        error: {
          message: 'An error occurred',
        },
      } as MonitoringEngineDescriptor);

      const result = await statusService.disable();
      expect(result.status).toBe('error');
      expect(result.error?.message).toBe('An error occurred');
    });

    it('should disable the privilege monitoring engine', async () => {
      // first call is to check the current status, second is after updating to 'disabled'
      mockGetEngineDescriptor.mockResolvedValueOnce({
        status: 'started',
      });
      mockGetEngineDescriptor.mockResolvedValueOnce({
        status: 'disabled',
      });

      const result = await statusService.disable();

      expect(mockRemovePrivilegeMonitoringTask).toHaveBeenCalled();
      expect(mockUpdateStatusEngineDescriptor).toHaveBeenCalledWith('disabled');
      expect(loggerMock.info).toHaveBeenCalledWith(
        expect.stringContaining('Privileged Monitoring Engine disabled successfully')
      );
      expect(result.status).toBe('disabled');
    });
  });

  describe('schedule now', () => {
    it('should schedule the privilege monitoring task to run immediately', async () => {
      mockGetEngineDescriptor.mockResolvedValue({ status: 'started' });

      await statusService.scheduleNow();

      expect(mockScheduleNow).toHaveBeenCalled();
      expect(auditMock.log).toHaveBeenCalled();
    });
    it('should not schedule if status is not started', async () => {
      mockGetEngineDescriptor.mockResolvedValue({ status: 'stopped' });

      await expect(statusService.scheduleNow()).rejects.toThrow(
        'The Privileged Monitoring Engine must be enabled to schedule a run. Current status: stopped'
      );
    });

    it('should not schedule if taskManager is not available', async () => {
      const { taskManager, ...optsWithoutTaskManager } = deps;
      dataClient = new PrivilegeMonitoringDataClient(optsWithoutTaskManager);
      statusService = createEngineStatusService(dataClient, mockSavedObjectClient);

      await expect(statusService.scheduleNow()).rejects.toThrow('Task Manager is not available');
    });
  });
});
