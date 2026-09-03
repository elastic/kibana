/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomTaskInstance, SyncTaskRunResult } from './sync_private_locations_monitors_task';
import {
  SyncPrivateLocationMonitorsTask,
  runSynPrivateLocationMonitorsTaskSoon,
  resetSyncPrivateCleanUpState,
  DEFAULT_TASK_SCHEDULE,
  DEFAULT_MAX_CLEANUP_RETRIES,
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
            'This task syncs private location monitor package policies, handling maintenance window changes and cleaning up duplicate policies',
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

    it('should schedule a per-location sync after cleanup', async () => {
      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'cleanUpDuplicatedPackagePolicies').mockResolvedValue({
        performCleanupSync: true,
      });
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

      expect(syncSpy).not.toHaveBeenCalled();
      // `schedule`, not `ensureScheduled`: a fixed id let a pending instance from
      // an earlier cleanup swallow this request, so the recreate never happened.
      expect(mockTaskManagerStart.ensureScheduled).not.toHaveBeenCalled();
      expect(mockTaskManagerStart.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: 'Synthetics:Sync-Private-Location-Monitors',
          state: { privateLocationId: 'pl-1' },
        })
      );
      expect(mockTaskManagerStart.schedule.mock.calls[0][0]).not.toHaveProperty('id');
      expect(result.error).toBeUndefined();
    });

    it('should schedule a sync task for each private location after cleanup', async () => {
      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'cleanUpDuplicatedPackagePolicies').mockResolvedValue({
        performCleanupSync: true,
      });
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
        {
          id: 'pl-2',
          label: 'Private Location 2',
          isServiceManaged: false,
          agentPolicyId: 'policy-2',
        },
      ]);

      const result = await task.runTask({ taskInstance });

      expect(mockTaskManagerStart.schedule).toHaveBeenCalledTimes(2);
      expect(mockTaskManagerStart.schedule).toHaveBeenCalledWith(
        expect.objectContaining({ state: { privateLocationId: 'pl-1' } })
      );
      expect(mockTaskManagerStart.schedule).toHaveBeenCalledWith(
        expect.objectContaining({ state: { privateLocationId: 'pl-2' } })
      );
      expect(result.error).toBeUndefined();
    });

    it('should leave cleanup pending so a failed scheduling is retried next run', async () => {
      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'cleanUpDuplicatedPackagePolicies').mockResolvedValue({
        performCleanupSync: true,
      });
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);
      mockTaskManagerStart.schedule.mockRejectedValueOnce(new Error('schedule failed'));

      const result = await task.runTask({ taskInstance });

      expect(result.error).toBeDefined();
      expect(result.state.hasAlreadyDoneCleanup).toBe(false);
    });

    it('should mark cleanup done when there are no private locations to sync', async () => {
      const taskInstance = getMockTaskInstance();
      jest.spyOn(task, 'cleanUpDuplicatedPackagePolicies').mockResolvedValue({
        performCleanupSync: true,
      });
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([]);

      const result = await task.runTask({ taskInstance });

      expect(result.error).toBeUndefined();
      expect(result.state.hasAlreadyDoneCleanup).toBe(true);
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

    it('should stop re-running cleanup once the retry budget is exhausted across task runs', async () => {
      // a monitor whose expected package policy never shows up in Fleet: every
      // cleanup pass wants a follow-up sync, and the recreate never succeeds
      (mockServerSetup.coreStart.savedObjects as any).createInternalRepository = jest
        .fn()
        .mockReturnValue(mockSoClient as any);
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
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        {
          id: 'pl-1',
          label: 'Private Location 1',
          isServiceManaged: false,
          agentPolicyId: 'policy-1',
        },
      ]);
      jest.spyOn(task, 'fetchMonitorMwsIds').mockResolvedValue([]);

      let state: Record<string, any> = {};
      for (let run = 0; run < 6; run++) {
        const result = await task.runTask({
          taskInstance: { ...getMockTaskInstance(), state } as CustomTaskInstance,
        });
        state = result.state;
      }

      // maxCleanUpRetries must actually run out, otherwise the task re-scans every
      // monitor and re-schedules a full per-location sync on every interval forever
      expect(state.hasAlreadyDoneCleanup).toBe(true);
      expect(mockTaskManagerStart.schedule).toHaveBeenCalledTimes(3);
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
      task = new SyncPrivateLocationMonitorsTask(
        mockServerSetup as any,
        mockSyntheticsMonitorClient as unknown as SyntheticsMonitorClient
      );
    });

    it('should not delete any policies if all are expected', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield ['monitor1-loc1'];
        })()
      );
      const state = {} as { hasAlreadyDoneCleanup?: boolean };
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, state as any);
      expect(mockFleet.packagePolicyService.delete).not.toHaveBeenCalled();
      expect(result.performCleanupSync).toBe(false);
      expect(state.hasAlreadyDoneCleanup).toBe(true);
    });

    it('should delete unexpected policies and set performCleanupSync true', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield ['monitor1-loc1', 'unexpected-policy'];
        })()
      );
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, {} as any);
      expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
        mockSoClient,
        expect.anything(),
        ['unexpected-policy'],
        { force: true, ignoreMissing: true, spaceIds: ['*'] }
      );
      expect(result.performCleanupSync).toBe(true);
    });

    it('should not charge the retry budget for a pass that deleted policies', async () => {
      mockFleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
        (async function* () {
          yield ['monitor1-loc1', 'unexpected-policy'];
        })()
      );
      const state = { hasAlreadyDoneCleanup: false, maxCleanUpRetries: 3 };

      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, state as any);

      expect(result.performCleanupSync).toBe(true);
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
      const result = await task.cleanUpDuplicatedPackagePolicies(mockSoClient as any, state as any);
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
        const result = await task.cleanUpDuplicatedPackagePolicies(
          mockSoClient as any,
          state as any
        );
        expect(result.performCleanupSync).toBe(true);
        expect(state.hasAlreadyDoneCleanup).toBe(false);
      }
      expect(state.maxCleanUpRetries).toBe(0);

      const exhausted = await task.cleanUpDuplicatedPackagePolicies(
        mockSoClient as any,
        state as any
      );

      expect(exhausted.performCleanupSync).toBe(false);
      expect(state.hasAlreadyDoneCleanup).toBe(true);
      // the spent budget is left on the state so the exhaustion stays visible;
      // only an explicit cleanup request restores it
      expect(state.maxCleanUpRetries).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('max retries have been reached')
      );
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
      expect(state.maxCleanUpRetries).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('max retries have been reached')
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
      expect(state.maxCleanUpRetries).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('max retries have been reached')
      );
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

    it('falls back to DEFAULT_TASK_SCHEDULE when task has no schedule', async () => {
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

describe('resetSyncPrivateCleanUpState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskManagerStart.runSoon.mockResolvedValue({ id: 'x' } as any);
  });

  const appliedState = (prevState: Record<string, unknown>) => {
    const stateMapFn = mockTaskManagerStart.bulkUpdateState.mock.calls[0][1];
    return stateMapFn(prevState, 'Synthetics:Sync-Private-Location-Monitors-single-instance');
  };

  it('restores the retry budget when cleanup is requested', async () => {
    await resetSyncPrivateCleanUpState({
      server: mockServerSetup as any,
      hasAlreadyDoneCleanup: false,
    });

    // The budget is shared with the periodic runs. Without restoring it here an
    // explicit request could inherit a budget those runs had already spent, and
    // cleanup would be skipped outright while this call reported success.
    expect(appliedState({ hasAlreadyDoneCleanup: true, maxCleanUpRetries: 0 })).toEqual(
      expect.objectContaining({
        hasAlreadyDoneCleanup: false,
        maxCleanUpRetries: DEFAULT_MAX_CLEANUP_RETRIES,
      })
    );
    expect(mockTaskManagerStart.runSoon).toHaveBeenCalledWith(
      'Synthetics:Sync-Private-Location-Monitors-single-instance'
    );
  });

  it('leaves the retry budget alone when cleanup is being marked done', async () => {
    await resetSyncPrivateCleanUpState({
      server: mockServerSetup as any,
      hasAlreadyDoneCleanup: true,
    });

    expect(appliedState({ hasAlreadyDoneCleanup: false, maxCleanUpRetries: 1 })).toEqual(
      expect.objectContaining({ hasAlreadyDoneCleanup: true, maxCleanUpRetries: 1 })
    );
  });

  it('propagates a scheduling failure', async () => {
    mockTaskManagerStart.runSoon.mockRejectedValue(new Error('already running'));

    await expect(
      resetSyncPrivateCleanUpState({
        server: mockServerSetup as any,
        hasAlreadyDoneCleanup: false,
        retries: 0,
      })
    ).rejects.toThrow('already running');
  });
});
