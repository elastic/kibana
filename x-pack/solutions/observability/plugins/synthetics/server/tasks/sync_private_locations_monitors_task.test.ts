/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CustomTaskInstance,
  LeftoverCleanupTaskState,
  SyncTaskRunResult,
} from './sync_private_locations_monitors_task';
import {
  SyncPrivateLocationMonitorsTask,
  runSynPrivateLocationMonitorsTaskSoon,
  DEFAULT_TASK_SCHEDULE,
  DEFAULT_MAX_CLEANUP_RETRIES,
  LEFTOVER_CLEANUP_SCAN_VERSION,
} from './sync_private_locations_monitors_task';
import {
  DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE,
  cleanUpDuplicatedPackagePolicies,
} from './clean_up_duplicate_policies';
import { getFilterForTestNowRun } from './test_now_run_filter';
import { syntheticsMonitorSOTypes } from '../../common/types/saved_objects';
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
    editMonitors: jest.fn().mockResolvedValue({ failedUpdates: [], failedCreates: [] }),
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

const scheduleOf = (result: SyncTaskRunResult) => {
  if ('schedule' in result) {
    return result.schedule;
  }
};
const runAtOf = (result: SyncTaskRunResult) => {
  if ('runAt' in result) {
    return result.runAt;
  }
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
  });

  describe('constructor', () => {
    it('should register task definitions correctly', () => {
      task.registerTaskDefinition(mockTaskManager as any);
      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledWith({
        'Synthetics:Sync-Private-Location-Monitors': expect.objectContaining({
          title: 'Synthetics Sync Private Location Monitors Task',
          description:
            'This task syncs private location monitor package policies, handling maintenance window changes.',
          timeout: '10m',
          maxAttempts: 1,
          createTaskRunner: expect.any(Function),
        }),
      });
    });
  });

  describe('start', () => {
    it('uses the existing task schedule when task already exists', async () => {
      mockTaskManagerStart.get.mockResolvedValue({
        schedule: { interval: '10m' },
      } as any);

      await task.start();

      expect(mockTaskManagerStart.get).toHaveBeenCalledWith(
        'Synthetics:Sync-Private-Location-Monitors-single-instance'
      );
      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ schedule: { interval: '10m' } })
      );
    });

    it('falls back to DEFAULT_TASK_SCHEDULE when task does not exist yet', async () => {
      mockTaskManagerStart.get.mockRejectedValue({ statusCode: 404 });

      await task.start();

      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ schedule: { interval: DEFAULT_TASK_SCHEDULE } })
      );
    });

    it('uses DEFAULT_TASK_SCHEDULE when existing task has no schedule', async () => {
      mockTaskManagerStart.get.mockResolvedValue({ schedule: undefined } as any);

      await task.start();

      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ schedule: { interval: DEFAULT_TASK_SCHEDULE } })
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
        lastStartedAt: expect.anything(),
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
      expect(scheduleOf(result)).toEqual({ interval: DEFAULT_TASK_SCHEDULE });
      expect(runAtOf(result)).toBeUndefined();
    });

    it('schedules an immediate follow-up when an MW is updated after this run started', async () => {
      const startedAt = new Date('2024-06-01T10:00:00.000Z');
      const taskInstance = {
        ...getMockTaskInstance(),
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
      mockSyntheticsMonitorClient.syntheticsService.getMaintenanceWindows = jest
        .fn()
        .mockResolvedValue([{ id: 'mw-1', updatedAt: '2024-06-01T10:00:05.000Z' }]);

      const result = await task.runTask({ taskInstance });

      expect(result.error).toBeUndefined();
      expect(runAtOf(result)).toBeInstanceOf(Date);
      expect(scheduleOf(result)).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('scheduling an immediate follow-up')
      );
    });

    it('does not follow up when only an unrelated MW was updated during this run', async () => {
      const startedAt = new Date('2024-06-01T10:00:00.000Z');
      const taskInstance = {
        ...getMockTaskInstance(),
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
      mockSyntheticsMonitorClient.syntheticsService.getMaintenanceWindows = jest
        .fn()
        .mockResolvedValue([{ id: 'alerting-mw', updatedAt: '2024-06-01T10:00:05.000Z' }]);

      const result = await task.runTask({ taskInstance });

      expect(scheduleOf(result)).toEqual({ interval: DEFAULT_TASK_SCHEDULE });
      expect(runAtOf(result)).toBeUndefined();
    });

    it('does not follow up when MW updatedAt is not after this run started', async () => {
      const startedAt = new Date('2024-06-01T10:00:00.000Z');
      const taskInstance = {
        ...getMockTaskInstance(),
        startedAt,
      };
      jest.spyOn(task, 'hasMWsChanged').mockResolvedValue({
        hasMWsChanged: true,
        updatedMWs: [],
        missingMWIds: ['gone-mw'],
      } as any);
      jest.spyOn(task, 'fetchMonitorMwsIds').mockResolvedValue(['gone-mw']);
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
      mockSyntheticsMonitorClient.syntheticsService.getMaintenanceWindows = jest
        .fn()
        .mockResolvedValue([]);

      const result = await task.runTask({ taskInstance });

      expect(scheduleOf(result)).toEqual({ interval: DEFAULT_TASK_SCHEDULE });
      expect(runAtOf(result)).toBeUndefined();
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
        .mockResolvedValue({ failedCreatesBySpace: [] });

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
      expect(scheduleOf(result)).toBeUndefined();
    });

    it('should not return a schedule when a per-location sync fails', async () => {
      const taskInstance = getMockTaskInstance({ privateLocationId: 'pl-1' });
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
      jest
        .spyOn(task.deployPackagePolicies, 'syncAllPackagePolicies')
        .mockRejectedValue(new Error('create failed'));

      const result = await task.runTask({ taskInstance });

      expect(result.error).toBeDefined();
      // a schedule here would convert this one-shot task into a recurring one
      expect(scheduleOf(result)).toBeUndefined();
      expect(result.state.privateLocationId).toBeUndefined();
    });

    it('should skip MW sync when there are no private locations', async () => {
      const taskInstance = getMockTaskInstance();
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([]);

      const result = await task.runTask({ taskInstance });

      expect(result.error).toBeUndefined();
      expect(result.state.hasAlreadyDoneCleanup).toBeUndefined();
      expect(mockTaskManagerStart.schedule).not.toHaveBeenCalled();
    });

    it('should fail the per-location run when the sync reports failed creates', async () => {
      const taskInstance = getMockTaskInstance({ privateLocationId: 'pl-1' });
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
      jest.spyOn(task.deployPackagePolicies, 'syncAllPackagePolicies').mockResolvedValue({
        failedCreatesBySpace: [{ spaceId: 'space1', count: 2 }],
      });

      const result = await task.runTask({ taskInstance });

      // the recreate did not fully succeed, so cleanup must be able to re-attempt it
      expect(result.error).toBeDefined();
      expect(scheduleOf(result)).toBeUndefined();
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

  describe('haveMWsUpdatedSince', () => {
    it('returns true when an MW was updated after the given timestamp', async () => {
      mockSyntheticsMonitorClient.syntheticsService.getMaintenanceWindows = jest
        .fn()
        .mockResolvedValue([{ id: 'mw-1', updatedAt: '2024-06-01T10:00:05.000Z' }]);

      await expect(task.haveMWsUpdatedSince('2024-06-01T10:00:00.000Z', ['mw-1'])).resolves.toBe(
        true
      );
    });

    it('returns false when MW updates are not after the given timestamp', async () => {
      mockSyntheticsMonitorClient.syntheticsService.getMaintenanceWindows = jest
        .fn()
        .mockResolvedValue([{ id: 'mw-1', updatedAt: '2024-06-01T09:59:59.000Z' }]);

      await expect(task.haveMWsUpdatedSince('2024-06-01T10:00:00.000Z', ['mw-1'])).resolves.toBe(
        false
      );
    });

    it('returns false when the updated MW is not referenced by any monitor', async () => {
      mockSyntheticsMonitorClient.syntheticsService.getMaintenanceWindows = jest
        .fn()
        .mockResolvedValue([{ id: 'alerting-mw', updatedAt: '2024-06-01T10:00:05.000Z' }]);

      await expect(task.haveMWsUpdatedSince('2024-06-01T10:00:00.000Z', ['mw-1'])).resolves.toBe(
        false
      );
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
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1'];
        })()
      );
      mockFleet.packagePolicyService.delete.mockImplementation(
        async (_so: unknown, _es: unknown, ids: string[]) =>
          ids.map((id) => ({ id, success: true, policy_ids: ['agent-a'] }))
      );
      mockFleet.agentPolicyService.bumpRevision.mockResolvedValue(undefined as any);
      mockFleet.agentPolicyService.getByIds.mockImplementation(
        async (_soClient: unknown, ids: any) =>
          (ids as Array<{ id: string }>).map(({ id }) => ({ id, space_ids: [] } as any))
      );
      task = new SyncPrivateLocationMonitorsTask(
        mockServerSetup as any,
        mockSyntheticsMonitorClient as unknown as SyntheticsMonitorClient
      );
    });

    it('does not persist leftover cleanup latch on PL sync state', () => {
      const state = task.getNewTaskState({
        taskInstance: getMockTaskInstance({
          hasAlreadyDoneCleanup: true,
          maxCleanUpRetries: 0,
          cleanupScanVersion: LEFTOVER_CLEANUP_SCAN_VERSION,
        }),
      });
      expect(state.hasAlreadyDoneCleanup).toBeUndefined();
      expect(state.maxCleanUpRetries).toBeUndefined();
      expect(state.cleanupScanVersion).toBeUndefined();
    });

    it('should not delete any policies if all are expected', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield ['monitor1-loc1'];
        })()
      );
      const state = {} as { hasAlreadyDoneCleanup?: boolean };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );
      expect(mockSoClient.createPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          type: syntheticsMonitorSOTypes,
          namespaces: ['*'],
        })
      );
      expect(mockFleet.packagePolicyService.fetchAllItemIds).toHaveBeenCalledWith(
        mockSoClient,
        expect.objectContaining({
          kuery: getFilterForTestNowRun(true),
          spaceIds: ['*'],
          perPage: DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE,
        })
      );
      expect(mockFleet.packagePolicyService.delete).not.toHaveBeenCalled();
      expect(result.performCleanupSync).toBe(false);
      expect(result.failedAgentPolicyIds).toEqual([]);
      expect(result.attemptedAgentPolicyIds).toEqual([]);
      expect(state.hasAlreadyDoneCleanup).toBe(true);
    });

    it('deletes unexpected policies without requesting a follow-up sync', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield ['monitor1-loc1', 'unexpected-policy'];
        })()
      );
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        {} as any
      );
      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['unexpected-policy'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
      expect(result.performCleanupSync).toBe(false);
      expect(result.failedAgentPolicyIds).toEqual([]);
      expect(result.attemptedAgentPolicyIds).toEqual(['agent-a']);
    });

    it('should not charge the retry budget for a pass that deleted policies', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield ['monitor1-loc1', 'unexpected-policy'];
        })()
      );
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 3 };

      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(result.performCleanupSync).toBe(false);
      // Deleting policies is progress. Charging it drained the budget during
      // ordinary churn, and the next cleanup -- including one requested through
      // the API -- was then skipped while still reporting success.
      expect(state.maxCleanUpRetries).toBe(3);
    });

    it('should not mark cleanup done when a follow-up sync is required', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield [];
        })()
      );
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 3 };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );
      expect(result.performCleanupSync).toBe(true);
      expect(state.hasAlreadyDoneCleanup).toBe(false);
      // spends a retry so a permanently failing recreate eventually stops
      expect(state.maxCleanUpRetries).toBe(2);
    });

    it('should stop re-attempting the follow-up sync once retries are exhausted', async () => {
      // the shared mockFinder is single-use, so hand out a fresh one per call
      mockSoClient.createPointInTimeFinder = jest.fn().mockImplementation(() => ({
        async *find() {
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
        close: jest.fn().mockResolvedValue(undefined),
      }));
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield [];
        })()
      );
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 3 };

      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await cleanUpDuplicatedPackagePolicies(
          mockServerSetup as any,
          mockSoClient as any,
          state as any
        );
        expect(result.performCleanupSync).toBe(true);
        expect(state.hasAlreadyDoneCleanup).toBe(false);
      }
      expect(state.maxCleanUpRetries).toBe(0);

      const exhausted = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(exhausted.performCleanupSync).toBe(false);
      // the spent budget is left on the state so the exhaustion stays visible;
      // only an explicit cleanup request restores it
      expect(state.maxCleanUpRetries).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('max retries have been reached')
      );
    });

    it('does not request a follow-up sync when only unexpected extras were deleted', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield ['monitor1-loc1', 'unexpected-policy'];
        })()
      );

      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        {} as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['unexpected-policy'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
      expect(result.performCleanupSync).toBe(false);
    });

    it('still deletes extras when the recreate budget is exhausted', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield ['monitor1-loc1', 'unexpected-policy'];
        })()
      );
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 0 };

      await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['unexpected-policy'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
    });

    it('does not request recreate when the budget is exhausted and policies are missing', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield [];
        })()
      );
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 0 };

      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(result.performCleanupSync).toBe(false);
    });

    it('should set performCleanupSync true if expected policies are missing', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield [];
        })()
      );
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        {} as any
      );
      expect(result.performCleanupSync).toBe(true);
    });

    it('should handle errors gracefully and return performCleanupSync', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockRejectedValue(new Error('fail'));
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        {} as any
      );
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toHaveProperty('performCleanupSync');
    });

    it('should skip cleanup if hasAlreadyDoneCleanup is true on the current scan version', async () => {
      const state = {
        hasAlreadyDoneCleanup: true,
        maxCleanUpRetries: 3,
        cleanupScanVersion: LEFTOVER_CLEANUP_SCAN_VERSION,
      };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );
      expect(result.performCleanupSync).toBe(false);
      expect(mockFleet.packagePolicyService.delete).not.toHaveBeenCalled();
      expect(mockFleet.packagePolicyService.fetchAllItemIds).not.toHaveBeenCalled();
      expect(state.hasAlreadyDoneCleanup).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[PrivateLocationCleanUpTask] Skipping cleanup of duplicated package policies as it has already been done once'
      );
    });

    it('should charge retries when extra package policies fail to delete', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1', 'unexpected-policy'];
        })()
      );
      mockFleet.packagePolicyService.delete.mockResolvedValue([
        { id: 'unexpected-policy', success: false },
      ]);
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 3 };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(result.performCleanupSync).toBe(false);
      expect(state.maxCleanUpRetries).toBe(2);
      expect(state.hasAlreadyDoneCleanup).toBe(false);
    });

    it('should stop retrying extra deletes once the retry budget is exhausted', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1', 'unexpected-policy'];
        })()
      );
      mockFleet.packagePolicyService.delete.mockResolvedValue([
        { id: 'unexpected-policy', success: false },
      ]);
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 3 };

      for (let attempt = 0; attempt < 3; attempt++) {
        await cleanUpDuplicatedPackagePolicies(
          mockServerSetup as any,
          mockSoClient as any,
          state as any
        );
      }
      expect(state.maxCleanUpRetries).toBe(0);
      expect(state.hasAlreadyDoneCleanup).toBe(true);

      mockFleet.packagePolicyService.delete.mockClear();
      const exhausted = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(exhausted.performCleanupSync).toBe(false);
      expect(mockFleet.packagePolicyService.delete).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('max retries have been reached')
      );
    });

    it('should delete extra package policies even when hasAlreadyDoneCleanup is true', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1', 'monitor1-loc1-stores'];
        })()
      );
      const state: Partial<LeftoverCleanupTaskState> = {
        hasAlreadyDoneCleanup: true,
        maxCleanUpRetries: 3,
      };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['monitor1-loc1-stores'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
      expect(mockFleet.agentPolicyService.bumpRevision).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'agent-a',
        { asyncDeploy: true }
      );
      expect(result.performCleanupSync).toBe(false);
      expect(state.hasAlreadyDoneCleanup).toBe(false);
      expect(state.maxCleanUpRetries).toBe(DEFAULT_MAX_CLEANUP_RETRIES);
      expect(state.cleanupScanVersion).toBe(LEFTOVER_CLEANUP_SCAN_VERSION);
    });

    it('scans leftovers once after a stale scan version, then skips on later runs', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1'];
        })()
      );
      const state = {
        hasAlreadyDoneCleanup: true,
        maxCleanUpRetries: 3,
        cleanupScanVersion: 0,
      };

      const first = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );
      expect(first.performCleanupSync).toBe(false);
      expect(mockFleet.packagePolicyService.fetchAllItemIds).toHaveBeenCalledTimes(1);
      expect(mockFleet.packagePolicyService.delete).not.toHaveBeenCalled();
      expect(state.hasAlreadyDoneCleanup).toBe(true);
      expect(state.cleanupScanVersion).toBe(LEFTOVER_CLEANUP_SCAN_VERSION);

      mockFleet.packagePolicyService.fetchAllItemIds.mockClear();
      const second = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );
      expect(second.performCleanupSync).toBe(false);
      expect(mockFleet.packagePolicyService.fetchAllItemIds).not.toHaveBeenCalled();
    });

    it('restores a spent retry budget when unlatching a stale scan version', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1', 'monitor1-loc1-stores'];
        })()
      );
      const state: Partial<LeftoverCleanupTaskState> = {
        hasAlreadyDoneCleanup: true,
        maxCleanUpRetries: 0,
      };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(result.performCleanupSync).toBe(false);
      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalled();
      expect(state.maxCleanUpRetries).toBe(DEFAULT_MAX_CLEANUP_RETRIES);
      expect(state.cleanupScanVersion).toBe(LEFTOVER_CLEANUP_SCAN_VERSION);
    });

    it('deletes extras collected across fetch pages', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1', 'extra-a'];
          yield ['extra-b'];
        })()
      );
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        {} as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['extra-a', 'extra-b'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
      expect(result.performCleanupSync).toBe(false);
    });

    it('does not expect a package policy for service-managed locations', async () => {
      mockSoClient.createPointInTimeFinder = jest.fn().mockReturnValue({
        async *find() {
          yield {
            saved_objects: [
              {
                id: 'monitor1',
                attributes: {
                  origin: 'ui',
                  locations: [
                    { id: 'loc1', isServiceManaged: false },
                    { id: 'public-1', isServiceManaged: true },
                  ],
                  id: 'monitor1',
                },
                namespaces: ['space1'],
              },
            ],
          };
        },
        close: jest.fn().mockResolvedValue(undefined),
      });
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1', 'monitor1-public-1'];
        })()
      );

      await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        {} as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['monitor1-public-1'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
    });

    it('should not reopen recreate when latched and expected policies are still missing', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield [];
        })()
      );
      const state = {
        hasAlreadyDoneCleanup: true,
        maxCleanUpRetries: 0,
        cleanupScanVersion: LEFTOVER_CLEANUP_SCAN_VERSION,
      };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(result.performCleanupSync).toBe(false);
      expect(mockFleet.packagePolicyService.delete).not.toHaveBeenCalled();
      expect(state.hasAlreadyDoneCleanup).toBe(true);
    });

    it('still scans but pauses recreate when maxCleanUpRetries is 0 or less', async () => {
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 0 };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );
      expect(mockFleet.packagePolicyService.fetchAllItemIds).toHaveBeenCalled();
      expect(result.performCleanupSync).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('max retries have been reached')
      );
    });

    it('should decrement maxCleanUpRetries and eventually skip after failures', async () => {
      // Simulate error in fetchAllItemIds
      mockFleet.packagePolicyService.fetchAllItemIds.mockRejectedValue(new Error('fail'));
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 2 };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );
      expect(state.maxCleanUpRetries).toBe(1);
      expect(result).toHaveProperty('performCleanupSync');
      // Call again to reach 0
      await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );
      expect(state.hasAlreadyDoneCleanup).toBe(true);
      expect(state.maxCleanUpRetries).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('max retries have been reached')
      );
    });

    it('deletes legacy space-suffixed leftover ids when the new-format policy exists', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1', 'monitor1-loc1-stores'];
        })()
      );

      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 3 } as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['monitor1-loc1-stores'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
      expect(result.performCleanupSync).toBe(false);
    });

    it('deletes extras and still requests recreate when expected policies are missing', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['orphan-policy'];
        })()
      );
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 3 };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['orphan-policy'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
      expect(result.performCleanupSync).toBe(true);
      expect(state.maxCleanUpRetries).toBe(3);
      expect(state.hasAlreadyDoneCleanup).toBe(false);
    });

    it('records failed revision bumps when leftover deletes succeed', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1', 'unexpected-policy'];
        })()
      );
      mockFleet.agentPolicyService.bumpRevision.mockRejectedValue(new Error('deployment failed'));
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 3 };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(result.performCleanupSync).toBe(false);
      expect(result.failedAgentPolicyIds).toEqual(['agent-a']);
      expect(result.attemptedAgentPolicyIds).toEqual(['agent-a']);
      expect(state.maxCleanUpRetries).toBe(3);
      expect(state.hasAlreadyDoneCleanup).toBe(false);
    });

    it('deletes a leftover space-suffixed policy when it is the only live policy for the monitor', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1-stores'];
        })()
      );
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 3 };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['monitor1-loc1-stores'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
      expect(result.performCleanupSync).toBe(true);
      expect(state.hasAlreadyDoneCleanup).toBe(false);
    });

    it('deletes per-space extras left by all-spaces monitor sharing', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield [
            'monitor1-loc1',
            'monitor1-loc1-default',
            'monitor1-loc1-stores',
            'monitor1-loc1-other',
          ];
        })()
      );

      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        {} as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['monitor1-loc1-default', 'monitor1-loc1-stores', 'monitor1-loc1-other'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
      expect(result.performCleanupSync).toBe(false);
    });

    it('expects one config-location policy for a multi-space monitor', async () => {
      mockSoClient.createPointInTimeFinder = jest.fn().mockReturnValue({
        async *find() {
          yield {
            saved_objects: [
              {
                id: 'monitor1',
                type: 'synthetics-monitor-multi-space',
                attributes: {
                  origin: 'ui',
                  locations: [{ id: 'loc1', isServiceManaged: false }],
                  id: 'monitor1',
                },
                namespaces: ['stores', 'default'],
              },
            ],
          };
        },
        close: jest.fn().mockResolvedValue(undefined),
      });
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1', 'monitor1-loc1-stores', 'monitor1-loc1-default'];
        })()
      );

      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        {} as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['monitor1-loc1-stores', 'monitor1-loc1-default'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
      expect(result.performCleanupSync).toBe(false);
    });

    it('deletes orphan new-format ids that match no monitor', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1', 'deadbeef-loc1', 'orphan-loc1'];
        })()
      );

      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        {} as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['deadbeef-loc1', 'orphan-loc1'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
      expect(result.performCleanupSync).toBe(false);
    });

    it('builds expected policy ids across monitor finder pages', async () => {
      mockSoClient.createPointInTimeFinder = jest.fn().mockReturnValue({
        async *find() {
          yield {
            saved_objects: [
              {
                id: 'monitor1',
                attributes: {
                  origin: 'ui',
                  locations: [{ id: 'loc1', isServiceManaged: false }],
                  id: 'monitor1',
                },
                namespaces: ['default'],
              },
            ],
          };
          yield {
            saved_objects: [
              {
                id: 'monitor2',
                attributes: {
                  origin: 'ui',
                  locations: [{ id: 'loc2', isServiceManaged: false }],
                  id: 'monitor2',
                },
                namespaces: ['stores'],
              },
            ],
          };
        },
        close: jest.fn().mockResolvedValue(undefined),
      });
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['monitor1-loc1', 'monitor2-loc2', 'orphan-loc1'];
        })()
      );

      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        {} as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['orphan-loc1'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
      expect(result.performCleanupSync).toBe(false);
    });

    it('uses config id and location id for project monitors', async () => {
      mockSoClient.createPointInTimeFinder = jest.fn().mockReturnValue({
        async *find() {
          yield {
            saved_objects: [
              {
                id: 'proj-monitor',
                attributes: {
                  origin: 'project',
                  locations: [{ id: 'loc1', isServiceManaged: false }],
                  id: 'proj-monitor',
                },
                namespaces: ['default'],
              },
            ],
          };
        },
        close: jest.fn().mockResolvedValue(undefined),
      });
      mockFleet.packagePolicyService.fetchAllItemIds.mockImplementation(async () =>
        (async function* () {
          yield ['proj-monitor-loc1', 'proj-monitor-loc1-default'];
        })()
      );

      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        {} as any
      );

      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['proj-monitor-loc1-default'],
        { force: true, ignoreMissing: true, spaceIds: ['*'], bumpRevision: false }
      );
      expect(result.performCleanupSync).toBe(false);
    });

    it('returns empty bump lists when leftover cleanup is skipped', async () => {
      const state = {
        hasAlreadyDoneCleanup: true,
        maxCleanUpRetries: 3,
        cleanupScanVersion: LEFTOVER_CLEANUP_SCAN_VERSION,
      };
      const result = await cleanUpDuplicatedPackagePolicies(
        mockServerSetup as any,
        mockSoClient as any,
        state as any
      );

      expect(result).toEqual({
        performCleanupSync: false,
        failedAgentPolicyIds: [],
        attemptedAgentPolicyIds: [],
      });
    });
  });

  describe('schedule resolution in runTask', () => {
    const mockPrivateLocations = [
      { id: 'pl-1', label: 'Private Location 1', isServiceManaged: false, agentPolicyId: 'p-1' },
    ];

    beforeEach(() => {
      jest.spyOn(task, 'hasMWsChanged').mockResolvedValue({ hasMWsChanged: false } as any);
      jest.spyOn(task, 'fetchMonitorMwsIds').mockResolvedValue(['mw-1']);
      jest
        .spyOn(getPrivateLocationsModule, 'getPrivateLocations')
        .mockResolvedValue(mockPrivateLocations as any);
    });

    it('uses the task schedule interval when present', async () => {
      const taskInstance = { ...getMockTaskInstance(), schedule: { interval: '15m' } };
      const result = await task.runTask({ taskInstance });
      expect(scheduleOf(result)).toEqual({ interval: '15m' });
    });

    it('returns DEFAULT_TASK_SCHEDULE when the instance has no schedule', async () => {
      const taskInstance = getMockTaskInstance();
      const result = await task.runTask({ taskInstance });
      expect(scheduleOf(result)).toEqual({ interval: DEFAULT_TASK_SCHEDULE });
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

  it('should log and rethrow if scheduling fails', async () => {
    const error = new Error('Failed to run soon');
    mockTaskManagerStart.runSoon.mockRejectedValue(error);

    // rethrown so an HTTP caller cannot be told the sync was scheduled when it
    // was not; fire-and-forget callers attach their own `catch`
    await expect(
      runSynPrivateLocationMonitorsTaskSoon({ server: mockServerSetup as any, retries: 0 })
    ).rejects.toThrow('Failed to run soon');

    expect(mockLogger.error).toHaveBeenCalledWith(
      `Error scheduling Synthetics sync private location monitors task: ${error.message}`,
      {
        error,
      }
    );
  });
});
