/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server/plugin';
import {
  SyncPrivateLocationMonitorsTask,
  runSynPrivateLocationMonitorsTaskSoon,
  CustomTaskInstance,
} from './sync_private_locations_monitors_task';
import { SyntheticsServerSetup } from '../types';
import { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import * as getPrivateLocationsModule from '../synthetics_service/get_private_locations';
import { coreMock } from '@kbn/core/server/mocks';
import { CoreStart } from '@kbn/core-lifecycle-server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { mockEncryptedSO } from '../synthetics_service/utils/mocks';

const mockTaskManagerStart = taskManagerMock.createStart();
const mockTaskManager = taskManagerMock.createSetup();

const mockSoClient = {
  find: jest.fn(),
  createInternalRepository: jest.fn(),
};

const mockEncryptedSoClient = mockEncryptedSO();

const mockSyntheticsMonitorClient = {
  privateLocationAPI: {
    editMonitors: jest.fn(),
  },
  syntheticsService: {
    getSyntheticsParams: jest.fn(),
    getMaintenanceWindows: jest.fn(),
  },
};
const mockLogger = loggerMock.create();

const mockServerSetup: jest.Mocked<SyntheticsServerSetup> = {
  coreStart: coreMock.createStart() as CoreStart,
  pluginsStart: {
    taskManager: mockTaskManagerStart,
  } as any,
  encryptedSavedObjects: mockEncryptedSoClient as any,
  logger: mockLogger,
} as any;

const getMockTaskInstance = (state: Record<string, any> = {}): CustomTaskInstance => {
  return {
    id: 'test-task',
    taskType: 'Test:Task',
    startedAt: new Date(),
    scheduledAt: new Date(),
    status: TaskStatus.Running,
    runAt: new Date(),
    attempts: 1,
    ownerId: 'test-owner',
    retryAt: null,
    state: {
      lastStartedAt: '2023-01-01T12:00:00.000Z',
      lastTotalParams: 1,
      lastTotalMWs: 1,
      attempts: 1,
      ...state,
    },
    params: {},
  };
};

describe('SyncPrivateLocationMonitorsTask', () => {
  let task: SyncPrivateLocationMonitorsTask;

  beforeEach(() => {
    jest.clearAllMocks();
    task = new SyncPrivateLocationMonitorsTask(
      mockServerSetup as any,
      mockTaskManager as unknown as TaskManagerSetupContract,
      mockSyntheticsMonitorClient as unknown as SyntheticsMonitorClient
    );
    mockSoClient.createInternalRepository.mockReturnValue(mockSoClient as any);
  });

  describe('constructor', () => {
    it('should register task definitions correctly', () => {
      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledWith({
        'Synthetics:Sync-Private-Location-Monitors': expect.objectContaining({
          title: 'Synthetics Sync Global Params Task',
          description:
            'This task is executed so that we can sync private location monitors for example when global params are updated',
          timeout: '3m',
          maxAttempts: 3,
          createTaskRunner: expect.any(Function),
        }),
      });
    });
  });

  describe('start', () => {
    it('should schedule the task correctly', async () => {
      await task.start();
      expect(mockLogger.debug).toHaveBeenCalledWith('Scheduling private location task');
      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith({
        id: 'Synthetics:Sync-Private-Location-Monitors-single-instance',
        state: {},
        schedule: {
          interval: '5m',
        },
        taskType: 'Synthetics:Sync-Private-Location-Monitors',
        params: {},
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Sync private location monitors task scheduled successfully'
      );
    });
  });

  describe('runTask', () => {
    it('should skip sync if no data has changed', async () => {
      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'hasAnyDataChanged').mockResolvedValue({
        hasDataChanged: false,
        totalParams: 1,
        totalMWs: 1,
      });
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);

      const result = await task.runTask({ taskInstance });

      expect(task.hasAnyDataChanged).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('No data has changed since last run')
      );
      expect(mockSyntheticsMonitorClient.privateLocationAPI.editMonitors).not.toHaveBeenCalled();
      expect(result.error).toBeUndefined();
      expect(result.state).toEqual({
        lastStartedAt: taskInstance.startedAt?.toISOString(),
        lastTotalParams: 1,
        lastTotalMWs: 1,
      });
    });

    it('should run sync if data has changed', async () => {
      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'hasAnyDataChanged').mockResolvedValue({
        hasDataChanged: true,
        totalParams: 2,
        totalMWs: 1,
      });
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);
      jest.spyOn(task, 'syncGlobalParams').mockResolvedValue(undefined);

      const result = await task.runTask({ taskInstance });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Syncing private location monitors because data has changed'
      );
      expect(task.syncGlobalParams).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Sync of private location monitors succeeded');
      expect(result.error).toBeUndefined();
      expect(result.state).toEqual({
        lastStartedAt: taskInstance.startedAt?.toISOString(),
        lastTotalParams: 2,
        lastTotalMWs: 1,
      });
    });

    it('should not sync if data changed but no private locations exist', async () => {
      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'hasAnyDataChanged').mockResolvedValue({
        hasDataChanged: true,
        totalParams: 2,
        totalMWs: 1,
      });
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([]);
      jest.spyOn(task, 'syncGlobalParams');

      await task.runTask({ taskInstance });

      expect(getPrivateLocationsModule.getPrivateLocations).toHaveBeenCalled();
      expect(task.syncGlobalParams).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Sync of private location monitors succeeded');
    });

    it('should handle errors during the run', async () => {
      const taskInstance = getMockTaskInstance();
      const error = new Error('Sync failed');
      jest.spyOn(task, 'hasAnyDataChanged').mockRejectedValue(error);

      const result = await task.runTask({ taskInstance });

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Sync of private location monitors failed: ${error.message}`
      );
      expect(result.error).toBe(error);
      expect(result.state).toEqual({
        lastStartedAt: taskInstance.startedAt?.toISOString(),
        lastTotalParams: 1,
        lastTotalMWs: 1,
      });
    });
  });

  describe('hasAnyDataChanged', () => {
    it('should return true if params changed', async () => {
      jest
        .spyOn(task, 'hasAnyParamChanged')
        .mockResolvedValue({ hasParamsChanges: true, totalParams: 2 } as any);
      jest
        .spyOn(task, 'hasMWsChanged')
        .mockResolvedValue({ hasMWsChanged: false, totalMWs: 1 } as any);

      const res = await task.hasAnyDataChanged({
        taskInstance: getMockTaskInstance(),
        soClient: mockSoClient as any,
      });

      expect(res.hasDataChanged).toBe(true);
      expect(res.totalParams).toBe(2);
      expect(res.totalMWs).toBe(1);
    });

    it('should return true if maintenance windows changed', async () => {
      jest
        .spyOn(task, 'hasAnyParamChanged')
        .mockResolvedValue({ hasParamsChanges: false, totalParams: 1 } as any);
      jest
        .spyOn(task, 'hasMWsChanged')
        .mockResolvedValue({ hasMWsChanged: true, totalMWs: 2 } as any);

      const res = await task.hasAnyDataChanged({
        taskInstance: getMockTaskInstance(),
        soClient: mockSoClient as any,
      });

      expect(res.hasDataChanged).toBe(true);
    });

    it('should return false if nothing changed', async () => {
      jest
        .spyOn(task, 'hasAnyParamChanged')
        .mockResolvedValue({ hasParamsChanges: false, totalParams: 1 } as any);
      jest
        .spyOn(task, 'hasMWsChanged')
        .mockResolvedValue({ hasMWsChanged: false, totalMWs: 1 } as any);

      const res = await task.hasAnyDataChanged({
        taskInstance: getMockTaskInstance(),
        soClient: mockSoClient as any,
      });

      expect(res.hasDataChanged).toBe(false);
    });
  });

  describe('hasAnyParamChanged', () => {
    it('returns true if updated params are found', async () => {
      mockSoClient.find
        .mockResolvedValueOnce({ total: 1 }) // updated
        .mockResolvedValueOnce({ total: 10 }); // total
      const { hasParamsChanges } = await task.hasAnyParamChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '...',
        lastTotalParams: 10,
      });
      expect(hasParamsChanges).toBe(true);
    });

    it('returns true if total number of params changed', async () => {
      mockSoClient.find
        .mockResolvedValueOnce({ total: 0 }) // updated
        .mockResolvedValueOnce({ total: 11 }); // total
      const { hasParamsChanges } = await task.hasAnyParamChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '...',
        lastTotalParams: 10,
      });
      expect(hasParamsChanges).toBe(true);
    });

    it('returns false if no changes are detected', async () => {
      mockSoClient.find
        .mockResolvedValueOnce({ total: 0 }) // updated
        .mockResolvedValueOnce({ total: 10 }); // total
      const { hasParamsChanges } = await task.hasAnyParamChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '...',
        lastTotalParams: 10,
      });
      expect(hasParamsChanges).toBe(false);
    });
  });

  describe('hasMWsChanged', () => {
    it('returns true if updated MWs are found', async () => {
      mockSoClient.find
        .mockResolvedValueOnce({ total: 1 }) // updated
        .mockResolvedValueOnce({ total: 5 }); // total
      const { hasMWsChanged } = await task.hasMWsChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '...',
        lastTotalMWs: 5,
      });
      expect(hasMWsChanged).toBe(true);
    });

    it('returns true if total number of MWs changed', async () => {
      mockSoClient.find
        .mockResolvedValueOnce({ total: 0 }) // updated
        .mockResolvedValueOnce({ total: 6 }); // total
      const { hasMWsChanged } = await task.hasMWsChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '...',
        lastTotalMWs: 5,
      });
      expect(hasMWsChanged).toBe(true);
    });

    it('returns false if no changes are detected', async () => {
      mockSoClient.find
        .mockResolvedValueOnce({ total: 0 }) // updated
        .mockResolvedValueOnce({ total: 5 }); // total
      const { hasMWsChanged } = await task.hasMWsChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '...',
        lastTotalMWs: 5,
      });
      expect(hasMWsChanged).toBe(false);
    });
  });

  describe('syncGlobalParams', () => {
    it('should fetch all configs and edit monitors on private locations', async () => {
      const mockAllPrivateLocations = [{ id: 'pl-1', name: 'Private Location 1' }];

      // Mocking the return of getAllMonitorConfigs
      jest.spyOn(task, 'getAllMonitorConfigs').mockResolvedValue({
        configsBySpaces: {
          space1: [{ id: 'm1', locations: [{ name: 'pl-1', isServiceManaged: false }] }],
        },
        spaceIds: new Set(['space1']),
        paramsBySpace: { space1: { global: 'param' } },
        maintenanceWindows: [],
      } as any);

      jest
        .spyOn(task, 'parseLocations')
        .mockReturnValue({ privateLocations: ['pl-1'], publicLocations: [] } as any);

      await task.syncGlobalParams({
        allPrivateLocations: mockAllPrivateLocations as any,
        encryptedSavedObjects: mockEncryptedSoClient as any,
        soClient: mockSoClient as any,
      });

      expect(task.getAllMonitorConfigs).toHaveBeenCalled();
      expect(mockSyntheticsMonitorClient.privateLocationAPI.editMonitors).toHaveBeenCalledWith(
        expect.any(Array),
        mockAllPrivateLocations,
        'space1',
        []
      );
    });

    it('should not call editMonitors if no monitors are on private locations', async () => {
      jest.spyOn(task, 'getAllMonitorConfigs').mockResolvedValue({
        configsBySpaces: {
          space1: [{ id: 'm1', locations: [] }],
        },
        spaceIds: new Set(['space1']),
        paramsBySpace: {},
        maintenanceWindows: [],
      } as any);

      // This monitor has no private locations
      jest
        .spyOn(task, 'parseLocations')
        .mockReturnValue({ privateLocations: [], publicLocations: [] } as any);

      await task.syncGlobalParams({
        allPrivateLocations: [],
        soClient: mockSoClient as any,
        encryptedSavedObjects: mockEncryptedSoClient as any,
      });

      expect(mockSyntheticsMonitorClient.privateLocationAPI.editMonitors).not.toHaveBeenCalled();
    });
  });

  describe('parseLocations', () => {
    it('separates private and public locations correctly', () => {
      const config = {
        locations: [
          { name: 'private1', isServiceManaged: false },
          { name: 'public1', isServiceManaged: true },
          { name: 'private2', isServiceManaged: false },
        ],
      };
      const { privateLocations, publicLocations } = task.parseLocations(config as any);
      expect(privateLocations).toHaveLength(2);
      expect(publicLocations).toHaveLength(1);
      expect(privateLocations[0]).toEqual({ name: 'private1', isServiceManaged: false });
      expect(publicLocations[0]).toEqual({ name: 'public1', isServiceManaged: true });
    });

    it('handles empty locations array', () => {
      const config = { locations: [] };
      const { privateLocations, publicLocations } = task.parseLocations(config as any);
      expect(privateLocations).toHaveLength(0);
      expect(publicLocations).toHaveLength(0);
    });
  });
});

describe('runSynPrivateLocationMonitorsTaskSoon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should schedule the task to run soon successfully', async () => {
    await runSynPrivateLocationMonitorsTaskSoon({ server: mockServerSetup as any });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Scheduling Synthetics sync private location monitors task soon'
    );
    expect(mockTaskManagerStart.runSoon).toHaveBeenCalledWith(
      'Synthetics:Sync-Private-Location-Monitors-single-instance'
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Synthetics sync private location task scheduled successfully'
    );
  });

  it('should log an error if scheduling fails', async () => {
    const error = new Error('Failed to run soon');
    mockTaskManagerStart.runSoon.mockRejectedValue(error);

    await runSynPrivateLocationMonitorsTaskSoon({ server: mockServerSetup as any });

    expect(mockLogger.error).toHaveBeenCalledWith(
      `Error scheduling Synthetics sync private location monitors task: ${error.message}`,
      {
        error,
      }
    );
  });
});
