/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomTaskInstance } from './sync_private_locations_monitors_task';
import {
  SyncPrivateLocationMonitorsTask,
  runSynPrivateLocationMonitorsTaskSoon,
  DEFAULT_TASK_SCHEDULE,
} from './sync_private_locations_monitors_task';
import type { SyntheticsServerSetup } from '../types';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import * as getPrivateLocationsModule from '../synthetics_service/get_private_locations';
import * as syntheticsSettingsModule from '../saved_objects/synthetics_settings';
import { coreMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { CoreStart } from '@kbn/core-lifecycle-server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { mockEncryptedSO } from '../synthetics_service/utils/mocks';
import { createFleetStartContractMock } from '@kbn/fleet-plugin/server/mocks';
import { DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES } from '../constants/settings';

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
  fleet: mockFleet,
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
      mockSyntheticsMonitorClient as unknown as SyntheticsMonitorClient
    );
    mockSoClient.createInternalRepository.mockReturnValue(mockSoClient as any);
    jest
      .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
      .mockResolvedValue(DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);
  });

  describe('constructor', () => {
    it('should register task definitions correctly', () => {
      task.registerTaskDefinition(mockTaskManager as any);
      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledWith({
        'Synthetics:Sync-Private-Location-Monitors': expect.objectContaining({
          title: 'Synthetics Sync Private Location Monitors Task',
          description:
            'This task syncs private location monitor package policies, handling maintenance window changes and cleaning up duplicate policies',
          timeout: '10m',
          maxAttempts: 1,
          createTaskRunner: expect.any(Function),
        }),
      });
    });
  });

  describe('start', () => {
    it('should schedule the task correctly', async () => {
      await task.start();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[SyncPrivateLocationMonitorsTask] Scheduling private location task'
      );
      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith({
        id: 'Synthetics:Sync-Private-Location-Monitors-single-instance',
        state: {},
        schedule: {
          interval: DEFAULT_TASK_SCHEDULE,
        },
        taskType: 'Synthetics:Sync-Private-Location-Monitors',
        params: {},
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[SyncPrivateLocationMonitorsTask] Sync private location monitors task scheduled successfully'
      );
    });
  });

  describe('runTask', () => {
    it('should skip sync if no data has changed', async () => {
      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'hasMWsChanged').mockResolvedValue({
        hasMWsChanged: false,
      } as any);
      // fetchMonitorMwsIds is used in the implementation now
      jest.spyOn(task, 'fetchMonitorMwsIds').mockResolvedValue(['mw-1']);
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);

      const result = await task.runTask({ taskInstance });

      expect(task.hasMWsChanged).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('No data has changed since last run')
      );
      expect(mockSyntheticsMonitorClient.privateLocationAPI.editMonitors).not.toHaveBeenCalled();
      expect(result.error).toBeUndefined();
      expect(result.state).toEqual({
        disableAutoSync: false,
        hasAlreadyDoneCleanup: false,
        lastStartedAt: expect.anything(),
        maxCleanUpRetries: 2,
      });
    });

    it('should run sync if data has changed', async () => {
      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'hasMWsChanged').mockResolvedValue({
        hasMWsChanged: true,
        updatedMWs: [],
        missingMWIds: [],
      } as any);
      jest.spyOn(task, 'fetchMonitorMwsIds').mockResolvedValue(['mw-1']);
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);
      jest
        .spyOn(task.deployPackagePolicies, 'syncPackagePoliciesForMws')
        .mockResolvedValue(undefined);

      const result = await task.runTask({ taskInstance });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Syncing private location monitors because data has changed')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Sync of private location monitors succeeded')
      );
      expect(task.deployPackagePolicies.syncPackagePoliciesForMws).toHaveBeenCalled();
      expect(result.error).toBeUndefined();
      expect(result.state).toEqual({
        disableAutoSync: false,
        maxCleanUpRetries: 2,
        hasAlreadyDoneCleanup: false,
        lastStartedAt: expect.anything(),
      });
    });

    it('should handle errors during the run', async () => {
      const taskInstance = getMockTaskInstance();
      const error = new Error('Sync failed');
      // fetchMonitorMwsIds is called before hasMWsChanged in runTask
      jest.spyOn(task, 'fetchMonitorMwsIds').mockResolvedValue(['mw-1']);
      jest.spyOn(task, 'hasMWsChanged').mockRejectedValue(error);
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);

      const result = await task.runTask({ taskInstance });

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Sync of private location monitors failed: ${error.message}`
      );
      expect(result.error).toBe(error);
      expect(result.state).toEqual({
        disableAutoSync: false,
        lastStartedAt: expect.anything(),
        hasAlreadyDoneCleanup: false,
        maxCleanUpRetries: 2,
      });
    });

    it('should update lastStartedAt to the current startedAt value', async () => {
      const initialLastStartedAt = '2023-01-01T12:00:00.000Z';
      const startedAt = new Date('2024-06-01T10:00:00.000Z');
      const taskInstance = {
        ...getMockTaskInstance({ lastStartedAt: initialLastStartedAt }),
        startedAt,
      };
      jest.spyOn(task, 'hasMWsChanged').mockResolvedValue({
        hasMWsChanged: false,
      } as any);
      jest.spyOn(task, 'fetchMonitorMwsIds').mockResolvedValue(['mw-1']);
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);

      const result = await task.runTask({ taskInstance });

      expect(result.state.lastStartedAt).toBe(startedAt.toISOString());
    });

    it('should sync only for provided privateLocationId and clear it from state', async () => {
      const taskInstance = getMockTaskInstance({ privateLocationId: 'pl-1' });
      // Ensure the server's savedObjects.createInternalRepository returns an object for the call
      (mockServerSetup.coreStart.savedObjects as any).createInternalRepository = jest
        .fn()
        .mockReturnValue(mockSoClient as any);

      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);

      const syncSpy = jest
        .spyOn(task.deployPackagePolicies, 'syncAllPackagePolicies')
        .mockResolvedValue(undefined);

      const result = await task.runTask({ taskInstance });

      expect(syncSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          allPrivateLocations: expect.any(Array),
          encryptedSavedObjects: mockEncryptedSoClient,
          privateLocationId: 'pl-1',
          soClient: expect.any(Object),
        })
      );

      expect(result.state).toEqual({
        ...taskInstance.state,
        privateLocationId: undefined,
      });
    });
  });

  describe('hasAnyDataChanged', () => {
    it('should return true if maintenance windows changed', async () => {
      jest
        .spyOn(task, 'hasMWsChanged')
        .mockResolvedValue({ hasMWsChanged: true, totalMWs: 2 } as any);

      const res = await task.hasMWsChanged({
        taskState: { lastTotalMWs: 1 } as any,
        soClient: mockSoClient as any,
        lastStartedAt: new Date().toISOString(),
        monitorMwsIds: ['mw-1'],
      });

      expect(res.hasMWsChanged).toBe(true);
    });

    it('should return false if nothing changed', async () => {
      jest
        .spyOn(task, 'hasMWsChanged')
        .mockResolvedValue({ hasMWsChanged: false, totalMWs: 1 } as any);

      const taskState = { lastTotalParams: 1, lastTotalMWs: 1 };

      const res = await task.hasMWsChanged({
        taskState: taskState as any,
        soClient: mockSoClient as any,
        lastStartedAt: new Date().toISOString(),
        monitorMwsIds: ['mw-1'],
      });

      expect(res.hasMWsChanged).toBe(false);
    });
  });

  describe('hasMWsChanged', () => {
    it('returns true if updated MWs are found', async () => {
      // mock maintenance window client to return an updated MW
      mockSyntheticsMonitorClient.syntheticsService.getMaintenanceWindows = jest
        .fn()
        .mockReturnValue([{ id: 'mw-1', updatedAt: '2024-01-02T00:00:00.000Z' }]);

      const { hasMWsChanged } = await task.hasMWsChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '2024-01-01T00:00:00.000Z',
        taskState: {
          lastTotalMWs: 5,
        } as any,
        monitorMwsIds: ['mw-1'],
      });
      expect(hasMWsChanged).toBe(true);
    });

    it('returns true if total number of MWs changed (missing ids)', async () => {
      //  returns no maintenance windows -> missing ids detected
      mockSyntheticsMonitorClient.syntheticsService.getMaintenanceWindows = jest
        .fn()
        .mockReturnValue([]);

      const { hasMWsChanged } = await task.hasMWsChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '...',
        taskState: {
          lastTotalMWs: 5,
        } as any,
        monitorMwsIds: ['missing-mw'],
      });
      expect(hasMWsChanged).toBe(true);
    });

    it('returns false if no changes are detected', async () => {
      // bulkGet returns MWs updated before lastStartedAt and all ids present

      mockSyntheticsMonitorClient.syntheticsService.getMaintenanceWindows = jest
        .fn()
        .mockReturnValue([{ id: 'mw-1', updatedAt: '2023-01-01T00:00:00.000Z' }]);

      const { hasMWsChanged } = await task.hasMWsChanged({
        soClient: mockSoClient as any,
        lastStartedAt: '2023-02-01T00:00:00.000Z',
        taskState: {
          lastTotalMWs: 5,
        } as any,
        monitorMwsIds: ['mw-1'],
      });
      expect(hasMWsChanged).toBe(false);
    });
  });

  describe('syncGlobalParams', () => {
    it('should fetch all configs and edit monitors on private locations', async () => {
      const mockAllPrivateLocations = [{ id: 'pl-1', name: 'Private Location 1' }];

      // Mocking the return of getAllMonitorConfigs
      jest.spyOn(task.deployPackagePolicies, 'getAllMonitorConfigs').mockResolvedValue({
        configsBySpaces: {
          space1: [{ id: 'm1', locations: [{ name: 'pl-1', isServiceManaged: false }] }],
        },
        monitorSpaceIds: new Set(['space1']),
        paramsBySpace: { space1: { global: 'param' } },
        maintenanceWindows: [],
      } as any);

      jest
        .spyOn(task, 'parseLocations')
        .mockReturnValue({ privateLocations: ['pl-1'], publicLocations: [] } as any);

      await task.deployPackagePolicies.syncAllPackagePolicies({
        allPrivateLocations: mockAllPrivateLocations as any,
        soClient: mockSoClient as any,
        spaceIdToSync: 'space1',
        encryptedSavedObjects: mockEncryptedSoClient as any,
      });

      expect(task.deployPackagePolicies.getAllMonitorConfigs).toHaveBeenCalled();
      expect(mockSyntheticsMonitorClient.privateLocationAPI.editMonitors).toHaveBeenCalledWith(
        expect.any(Array),
        mockAllPrivateLocations,
        'space1',
        []
      );
    });

    it('should not call editMonitors if no monitors are on private locations', async () => {
      jest.spyOn(task.deployPackagePolicies, 'getAllMonitorConfigs').mockResolvedValue({
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

      await task.deployPackagePolicies.syncAllPackagePolicies({
        allPrivateLocations: [],
        soClient: mockSoClient as any,
        encryptedSavedObjects: mockEncryptedSoClient as any,
        spaceIdToSync: 'space1',
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
                  id: 'monitor1',
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
      expect(result.performCleanupSync).toBe(false);
    });

    it('should delete unexpected policies and set performCleanupSync true', async () => {
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
      expect(result.performCleanupSync).toBe(true);
    });

    it('should set performCleanupSync true if expected policies are missing', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield [];
        })()
      );
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, {} as any);
      expect(result.performCleanupSync).toBe(true);
    });

    it('should handle errors gracefully and return performCleanupSync', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockRejectedValue(new Error('fail'));
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, {} as any);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toHaveProperty('performCleanupSync');
    });

    it('should skip cleanup if hasAlreadyDoneCleanup is true', async () => {
      const state = { hasAlreadyDoneCleanup: true, maxCleanUpRetries: 3 };
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, state as any);
      expect(result.performCleanupSync).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[PrivateLocationCleanUpTask] Skipping cleanup of duplicated package policies as it has already been done once'
      );
    });

    it('should skip cleanup if maxCleanUpRetries is 0 or less', async () => {
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 0 };
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, state as any);
      expect(result.performCleanupSync).toBe(false);
      expect(state.hasAlreadyDoneCleanup).toBe(true);
      expect(state.maxCleanUpRetries).toBe(3);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[PrivateLocationCleanUpTask] Skipping cleanup of duplicated package policies as max retries have been reached'
      );
    });

    it('should decrement maxCleanUpRetries and eventually skip after failures', async () => {
      // Simulate error in fetchAllItemIds
      mockFleet.packagePolicyService.fetchAllItemIds.mockRejectedValue(new Error('fail'));
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 2 };
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, state as any);
      expect(state.maxCleanUpRetries).toBe(1);
      expect(result).toHaveProperty('performCleanupSync');
      // Call again to reach 0
      await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, state as any);
      expect(state.hasAlreadyDoneCleanup).toBe(true);
      expect(state.maxCleanUpRetries).toBe(3);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[PrivateLocationCleanUpTask] Skipping cleanup of duplicated package policies as max retries have been reached'
      );
    });
  });

  describe('resolveSyncInterval', () => {
    it('should use configured interval from dynamic settings', async () => {
      jest.spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings').mockResolvedValue({
        ...DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES,
        privateLocationsSyncInterval: 10,
      });

      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'hasMWsChanged').mockResolvedValue({ hasMWsChanged: false } as any);
      jest.spyOn(task, 'fetchMonitorMwsIds').mockResolvedValue(['mw-1']);
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);

      const result = await task.runTask({ taskInstance });

      expect(result.schedule).toEqual({ interval: '10m' });
    });

    it('should fall back to default when dynamic settings read fails', async () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockRejectedValue(new Error('SO not found'));

      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'hasMWsChanged').mockResolvedValue({ hasMWsChanged: false } as any);
      jest.spyOn(task, 'fetchMonitorMwsIds').mockResolvedValue(['mw-1']);
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);

      const result = await task.runTask({ taskInstance });

      expect(result.schedule).toEqual({ interval: DEFAULT_TASK_SCHEDULE });
    });

    it('should fall back to task schedule interval when settings read fails', async () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockRejectedValue(new Error('SO not found'));

      const taskInstance = {
        ...getMockTaskInstance(),
        schedule: { interval: '15m' },
      };
      jest.spyOn(task, 'hasMWsChanged').mockResolvedValue({ hasMWsChanged: false } as any);
      jest.spyOn(task, 'fetchMonitorMwsIds').mockResolvedValue(['mw-1']);
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);

      const result = await task.runTask({ taskInstance });

      expect(result.schedule).toEqual({ interval: '15m' });
    });

    it('should use default when privateLocationsSyncInterval is not set in dynamic settings', async () => {
      jest.spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings').mockResolvedValue({
        ...DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES,
        privateLocationsSyncInterval: undefined,
      });

      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'hasMWsChanged').mockResolvedValue({ hasMWsChanged: false } as any);
      jest.spyOn(task, 'fetchMonitorMwsIds').mockResolvedValue(['mw-1']);
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);

      const result = await task.runTask({ taskInstance });

      expect(result.schedule).toEqual({ interval: DEFAULT_TASK_SCHEDULE });
    });

    it('should follow full fallback chain: dynamic settings -> task schedule -> default', async () => {
      const { savedObjects } = mockServerSetup.coreStart;

      // Scenario 1: Dynamic settings has a valid value — uses it regardless of schedule
      jest.spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings').mockResolvedValue({
        ...DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES,
        privateLocationsSyncInterval: 7,
      });
      const taskWithSchedule = {
        ...getMockTaskInstance(),
        schedule: { interval: '15m' },
      };
      const result1 = await task.resolveSyncInterval(savedObjects, taskWithSchedule);
      expect(result1).toBe('7m');

      // Scenario 2: Dynamic settings read fails — falls back to task's current schedule
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockRejectedValue(new Error('SO read error'));
      const result2 = await task.resolveSyncInterval(savedObjects, taskWithSchedule);
      expect(result2).toBe('15m');

      // Scenario 3: Dynamic settings read fails and no schedule on task — falls back to default
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockRejectedValue(new Error('SO read error'));
      const result3 = await task.resolveSyncInterval(savedObjects, getMockTaskInstance());
      expect(result3).toBe(DEFAULT_TASK_SCHEDULE);

      // Scenario 4: Dynamic settings returns undefined for the interval — falls back to schedule then default
      jest.spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings').mockResolvedValue({
        ...DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES,
        privateLocationsSyncInterval: undefined,
      });
      const result4 = await task.resolveSyncInterval(savedObjects, getMockTaskInstance());
      expect(result4).toBe(DEFAULT_TASK_SCHEDULE);
    });
  });

  // Replace old monitorsHaveMaintenanceWindows tests with fetchMonitorMwsIds tests
  describe('fetchMonitorMwsIds', () => {
    it('returns the combined unique ids from monitor and legacy aggregations', async () => {
      mockSoClient.find.mockResolvedValue({
        aggregations: {
          monitorMws: { buckets: [{ key: 'a' }, { key: 'b' }] },
          legacyMonitorsMws: { buckets: [{ key: 'b' }, { key: 'c' }] },
        },
      } as any);

      const res = await task.fetchMonitorMwsIds(mockSoClient as any);
      expect(res).toEqual(expect.arrayContaining(['a', 'b', 'c']));
      expect(mockSoClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.anything(),
          perPage: 0,
          namespaces: [expect.any(String)],
          aggs: expect.any(Object),
        })
      );
    });

    it('returns empty array when aggregations are missing', async () => {
      mockSoClient.find.mockResolvedValue({} as any);

      const res = await task.fetchMonitorMwsIds(mockSoClient as any);
      expect(res).toEqual([]);
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
