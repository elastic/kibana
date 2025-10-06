/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server/plugin';
import type { CustomTaskInstance } from './sync_private_locations_monitors_task';
import {
  SyncPrivateLocationMonitorsTask,
  runSynPrivateLocationMonitorsTaskSoon,
} from './sync_private_locations_monitors_task';
import type { SyntheticsServerSetup } from '../types';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import * as getPrivateLocationsModule from '../synthetics_service/get_private_locations';
import { coreMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { CoreStart } from '@kbn/core-lifecycle-server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { mockEncryptedSO } from '../synthetics_service/utils/mocks';
import { createFleetStartContractMock } from '@kbn/fleet-plugin/server/mocks';

const mockTaskManagerStart = taskManagerMock.createStart();
const mockTaskManager = taskManagerMock.createSetup();
const mockSoClient = {
  ...savedObjectsRepositoryMock.create(),
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

const mockFleet = createFleetStartContractMock();

const mockServerSetup: jest.Mocked<SyntheticsServerSetup> = {
  coreStart: coreMock.createStart() as CoreStart,
  pluginsStart: {
    taskManager: mockTaskManagerStart,
    fleet: mockFleet,
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
        hasAlreadyDoneCleanup: false,
        startedAt: expect.anything(),
        lastStartedAt: expect.anything(),
        lastTotalParams: 1,
        lastTotalMWs: 1,
        maxCleanUpRetries: 2,
      });
    });

    it('should run sync if data has changed', async () => {
      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'hasAnyDataChanged').mockResolvedValue({
        hasDataChanged: true,
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
      expect(mockLogger.debug).toHaveBeenNthCalledWith(
        2,
        '[SyncPrivateLocationMonitorsTask] Starting cleanup of duplicated package policies '
      );

      expect(mockLogger.debug).toHaveBeenNthCalledWith(
        3,
        '[SyncPrivateLocationMonitorsTask] Syncing private location monitors because data has changed '
      );
      expect(mockLogger.debug).toHaveBeenNthCalledWith(
        4,
        '[SyncPrivateLocationMonitorsTask] Sync of private location monitors succeeded '
      );
      expect(task.syncGlobalParams).toHaveBeenCalled();
      expect(result.error).toBeUndefined();
      expect(result.state).toEqual({
        lastTotalParams: 1,
        lastTotalMWs: 1,
        maxCleanUpRetries: 2,
        hasAlreadyDoneCleanup: false,
        lastStartedAt: expect.anything(),
        startedAt: expect.anything(),
      });
    });

    it('should not sync if data changed but no private locations exist', async () => {
      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'hasAnyDataChanged').mockResolvedValue({
        hasDataChanged: true,
      });
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([]);
      jest.spyOn(task, 'syncGlobalParams');

      await task.runTask({ taskInstance });

      expect(getPrivateLocationsModule.getPrivateLocations).toHaveBeenCalled();
      expect(task.syncGlobalParams).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenLastCalledWith(
        '[SyncPrivateLocationMonitorsTask] Sync of private location monitors succeeded '
      );
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
        startedAt: expect.anything(),
        lastStartedAt: expect.anything(),
        lastTotalParams: 1,
        lastTotalMWs: 1,
        hasAlreadyDoneCleanup: false,
        maxCleanUpRetries: 2,
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
      const taskState = { lastTotalParams: 1, lastTotalMWs: 1 };

      const res = await task.hasAnyDataChanged({
        taskState: taskState as any,
        soClient: mockSoClient as any,
      });

      expect(res.hasDataChanged).toBe(true);
      expect(taskState.lastTotalParams).toBe(2);
      expect(taskState.lastTotalMWs).toBe(1);
    });

    it('should return true if maintenance windows changed', async () => {
      jest
        .spyOn(task, 'hasAnyParamChanged')
        .mockResolvedValue({ hasParamsChanges: false, totalParams: 1 } as any);
      jest
        .spyOn(task, 'hasMWsChanged')
        .mockResolvedValue({ hasMWsChanged: true, totalMWs: 2 } as any);

      const res = await task.hasAnyDataChanged({
        taskState: { lastTotalParams: 1, lastTotalMWs: 1 } as any,
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

      const taskState = { lastTotalParams: 1, lastTotalMWs: 1 };

      const res = await task.hasAnyDataChanged({
        taskState: taskState as any,
        soClient: mockSoClient as any,
      });

      expect(res.hasDataChanged).toBe(false);
    });
  });

  describe('hasAnyParamChanged', () => {
    it('returns true if updated params are found', async () => {
      mockSoClient.find
        .mockResolvedValueOnce({ total: 1 } as any) // updated
        .mockResolvedValueOnce({ total: 10 } as any); // total
      const { hasParamsChanges } = await task.hasAnyParamChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '...',
        lastTotalParams: 10,
      });
      expect(hasParamsChanges).toBe(true);
    });

    it('returns true if total number of params changed', async () => {
      mockSoClient.find
        .mockResolvedValueOnce({ total: 0 } as any) // updated
        .mockResolvedValueOnce({ total: 11 } as any); // total
      const { hasParamsChanges } = await task.hasAnyParamChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '...',
        lastTotalParams: 10,
      });
      expect(hasParamsChanges).toBe(true);
    });

    it('returns false if no changes are detected', async () => {
      mockSoClient.find
        .mockResolvedValueOnce({ total: 0 } as any) // updated
        .mockResolvedValueOnce({ total: 10 } as any); // total
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
        .mockResolvedValueOnce({ total: 1 } as any) // updated
        .mockResolvedValueOnce({ total: 5 } as any); // total
      const { hasMWsChanged } = await task.hasMWsChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '...',
        lastTotalMWs: 5,
      });
      expect(hasMWsChanged).toBe(true);
    });

    it('returns true if total number of MWs changed', async () => {
      mockSoClient.find
        .mockResolvedValueOnce({ total: 0 } as any) // updated
        .mockResolvedValueOnce({ total: 6 } as any); // total
      const { hasMWsChanged } = await task.hasMWsChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '...',
        lastTotalMWs: 5,
      });
      expect(hasMWsChanged).toBe(true);
    });

    it('returns false if no changes are detected', async () => {
      mockSoClient.find
        .mockResolvedValueOnce({ total: 0 } as any) // updated
        .mockResolvedValueOnce({ total: 5 } as any); // total
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

  describe('cleanUpDuplicatedPackagePolicies', () => {
    let mockFinder: any;

    beforeEach(() => {
      // // Mock finder
      let closed = false;
      mockFinder = {
        async *find() {
          if (closed) throw new Error('Finder closed');
          yield {
            saved_objects: [
              {
                id: 'monitor1',
                attributes: {
                  origin: 'ui',
                  locations: [{ id: 'loc1', isServiceManaged: false }],
                },
                namespaces: ['space1'],
              },
            ],
          };
        },
        close: jest.fn().mockImplementation(() => {
          closed = true;
          return Promise.resolve();
        }),
      };
      mockSoClient.createPointInTimeFinder = jest.fn().mockReturnValue(mockFinder);
      task = new SyncPrivateLocationMonitorsTask(
        mockServerSetup as any,
        mockTaskManager as unknown as TaskManagerSetupContract,
        mockSyntheticsMonitorClient as unknown as SyntheticsMonitorClient
      );
    });

    it('should not delete any policies if all are expected', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield ['monitor1-loc1-space1'];
        })()
      );
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, {} as any);
      expect(mockFleet.packagePolicyService.delete).not.toHaveBeenCalled();
      expect(result.performSync).toBe(false);
    });

    it('should delete unexpected policies and set performSync true', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield ['monitor1-loc1-space1', 'unexpected-policy'];
        })()
      );
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, {} as any);
      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['unexpected-policy'],
        { force: true, spaceIds: ['*'] }
      );
      expect(result.performSync).toBe(true);
    });

    it('should set performSync true if expected policies are missing', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield [];
        })()
      );
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, {} as any);
      expect(result.performSync).toBe(true);
    });

    it('should handle errors gracefully and return performSync', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockRejectedValue(new Error('fail'));
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, {} as any);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toHaveProperty('performSync');
    });

    it('should skip cleanup if hasAlreadyDoneCleanup is true', async () => {
      const state = { hasAlreadyDoneCleanup: true, maxCleanUpRetries: 3 };
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, state as any);
      expect(result.performSync).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[SyncPrivateLocationMonitorsTask] Skipping cleanup of duplicated package policies as it has already been done once '
      );
    });

    it('should skip cleanup if maxCleanUpRetries is 0 or less', async () => {
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 0 };
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, state as any);
      expect(result.performSync).toBe(false);
      expect(state.hasAlreadyDoneCleanup).toBe(true);
      expect(state.maxCleanUpRetries).toBe(3);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[SyncPrivateLocationMonitorsTask] Skipping cleanup of duplicated package policies as max retries have been reached '
      );
    });

    it('should decrement maxCleanUpRetries and eventually skip after failures', async () => {
      // Simulate error in fetchAllItemIds
      mockFleet.packagePolicyService.fetchAllItemIds.mockRejectedValue(new Error('fail'));
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 2 };
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, state as any);
      expect(state.maxCleanUpRetries).toBe(1);
      expect(result).toHaveProperty('performSync');
      // Call again to reach 0
      await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, state as any);
      expect(state.hasAlreadyDoneCleanup).toBe(true);
      expect(state.maxCleanUpRetries).toBe(3);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[SyncPrivateLocationMonitorsTask] Skipping cleanup of duplicated package policies as max retries have been reached '
      );
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

    await runSynPrivateLocationMonitorsTaskSoon({ server: mockServerSetup as any, retries: 0 });

    expect(mockLogger.error).toHaveBeenCalledWith(
      `Error scheduling Synthetics sync private location monitors task: ${error.message}`,
      {
        error,
      }
    );
  });
});
