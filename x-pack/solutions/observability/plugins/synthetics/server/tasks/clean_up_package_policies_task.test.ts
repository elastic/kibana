/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { createFleetStartContractMock } from '@kbn/fleet-plugin/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import type { CoreStart } from '@kbn/core-lifecycle-server';
import {
  BROWSER_TEST_NOW_RUN,
  LIGHTWEIGHT_TEST_NOW_RUN,
} from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import type { SyntheticsServerSetup } from '../types';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import { cleanUpDuplicatedPackagePolicies } from './clean_up_duplicate_policies';
import {
  DEFAULT_MAX_CLEANUP_RETRIES,
  LEFTOVER_CLEANUP_SCAN_VERSION,
  runTaskPerPrivateLocation,
} from './sync_private_locations_monitors_task';
import {
  registerCleanUpTask,
  runCleanUpPackagePoliciesTask,
  scheduleCleanUpTask,
  triggerCleanUpPackagePoliciesTask,
  SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
  SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
} from './clean_up_package_policies_task';

jest.mock('./clean_up_duplicate_policies', () => ({
  cleanUpDuplicatedPackagePolicies: jest.fn(),
}));

jest.mock('../synthetics_service/get_private_locations', () => ({
  getPrivateLocations: jest.fn(),
}));

jest.mock('./sync_private_locations_monitors_task', () => {
  const actual = jest.requireActual('./sync_private_locations_monitors_task');
  return {
    ...actual,
    runTaskPerPrivateLocation: jest.fn(),
  };
});

const cleanUpDuplicatedPackagePoliciesMock =
  cleanUpDuplicatedPackagePolicies as jest.MockedFunction<typeof cleanUpDuplicatedPackagePolicies>;
const getPrivateLocationsMock = getPrivateLocations as jest.MockedFunction<
  typeof getPrivateLocations
>;
const runTaskPerPrivateLocationMock = runTaskPerPrivateLocation as jest.MockedFunction<
  typeof runTaskPerPrivateLocation
>;

const mockTaskManagerStart = taskManagerMock.createStart();
const mockTaskManager = taskManagerMock.createSetup();
const mockLogger = loggerMock.create();
const mockFleet = createFleetStartContractMock();
const mockSoClient = { createInternalRepository: jest.fn() };

const mockServerSetup = {
  coreStart: {
    ...coreMock.createStart(),
    elasticsearch: {
      client: {
        asInternalUser: {},
      },
    },
    savedObjects: {
      createInternalRepository: jest.fn().mockReturnValue(mockSoClient),
    },
  } as unknown as CoreStart,
  pluginsStart: {
    taskManager: mockTaskManagerStart,
    fleet: mockFleet,
  },
  logger: mockLogger,
} as unknown as SyntheticsServerSetup;

const getTaskInstance = () =>
  ({
    id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
    taskType: SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
    startedAt: new Date(),
    scheduledAt: new Date(),
    status: TaskStatus.Running,
    runAt: new Date(),
    attempts: 1,
    ownerId: 'test-owner',
    retryAt: null,
    state: {},
    params: {},
  } as const);

describe('clean_up_package_policies_task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFleet.packagePolicyService.list.mockResolvedValue({ items: [], total: 0 } as any);
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({ performCleanupSync: false });
    getPrivateLocationsMock.mockResolvedValue([]);
    runTaskPerPrivateLocationMock.mockResolvedValue(undefined);
    mockTaskManagerStart.ensureScheduled.mockResolvedValue({
      id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
      schedule: { interval: '60m' },
    } as any);
    mockTaskManagerStart.runSoon.mockResolvedValue({
      id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
    } as any);
  });

  it('registers a 10m timeout', () => {
    registerCleanUpTask(mockTaskManager as any, mockServerSetup);

    expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledWith({
      [SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE]: expect.objectContaining({
        timeout: '10m',
        maxAttempts: 3,
      }),
    });
  });

  it('schedules 24h when no Test Now policies remain', async () => {
    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, getTaskInstance() as any);

    expect(cleanUpDuplicatedPackagePoliciesMock).toHaveBeenCalledWith(
      mockServerSetup,
      mockSoClient,
      expect.objectContaining({
        hasAlreadyDoneCleanup: false,
        maxCleanUpRetries: DEFAULT_MAX_CLEANUP_RETRIES,
        cleanupScanVersion: LEFTOVER_CLEANUP_SCAN_VERSION,
      })
    );
    expect(result.schedule).toEqual({ interval: '24h' });
  });

  it('schedules 20m when Test Now policies are still within TTL', async () => {
    mockFleet.packagePolicyService.list.mockResolvedValue({
      items: [
        {
          id: 'lw-1',
          name: LIGHTWEIGHT_TEST_NOW_RUN,
          created_at: moment().subtract(1, 'minute').toISOString(),
        },
      ],
      total: 1,
    } as any);

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, getTaskInstance() as any);

    expect(mockFleet.packagePolicyService.delete).not.toHaveBeenCalled();
    expect(cleanUpDuplicatedPackagePoliciesMock).toHaveBeenCalled();
    expect(result.schedule).toEqual({ interval: '20m' });
  });

  it('deletes expired Test Now policies then still scans leftovers', async () => {
    mockFleet.packagePolicyService.list.mockResolvedValue({
      items: [
        {
          id: 'browser-old',
          name: BROWSER_TEST_NOW_RUN,
          created_at: moment().subtract(20, 'minutes').toISOString(),
        },
      ],
      total: 1,
    } as any);

    await runCleanUpPackagePoliciesTask(mockServerSetup, getTaskInstance() as any);

    expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
      mockSoClient,
      {},
      ['browser-old'],
      { force: true }
    );
    expect(cleanUpDuplicatedPackagePoliciesMock).toHaveBeenCalled();
  });

  it('schedules a per-location sync after leftover deletes', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({ performCleanupSync: true });
    getPrivateLocationsMock.mockResolvedValue([{ id: 'pl-1' }, { id: 'pl-2' }] as any);

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, getTaskInstance() as any);

    expect(runTaskPerPrivateLocationMock).toHaveBeenCalledTimes(2);
    expect(runTaskPerPrivateLocationMock).toHaveBeenCalledWith({
      server: mockServerSetup,
      privateLocationId: 'pl-1',
    });
    expect(runTaskPerPrivateLocationMock).toHaveBeenCalledWith({
      server: mockServerSetup,
      privateLocationId: 'pl-2',
    });
    expect(result.schedule).toEqual({ interval: '24h' });
  });

  it('does not schedule per-location sync when leftover scan finds nothing to recreate', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({ performCleanupSync: false });

    await runCleanUpPackagePoliciesTask(mockServerSetup, getTaskInstance() as any);

    expect(getPrivateLocationsMock).not.toHaveBeenCalled();
    expect(runTaskPerPrivateLocationMock).not.toHaveBeenCalled();
  });

  it('still returns 24h when leftover cleanup throws', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockRejectedValue(new Error('scan failed'));

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, getTaskInstance() as any);

    expect(mockLogger.error).toHaveBeenCalled();
    expect(result.schedule).toEqual({ interval: '24h' });
  });

  it('triggerCleanUpPackagePoliciesTask ensures the task then runSoons it', async () => {
    await triggerCleanUpPackagePoliciesTask(mockServerSetup);

    expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
        taskType: SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
      })
    );
    expect(mockTaskManagerStart.runSoon).toHaveBeenCalledWith(SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID);
  });

  it('triggerCleanUpPackagePoliciesTask throws when runSoon fails', async () => {
    mockTaskManagerStart.runSoon.mockRejectedValue(new Error('already running'));

    await expect(triggerCleanUpPackagePoliciesTask(mockServerSetup)).rejects.toThrow(
      'already running'
    );
  });

  it('scheduleCleanUpTask swallows scheduling errors', async () => {
    mockTaskManagerStart.runSoon.mockRejectedValue(new Error('already running'));

    await expect(scheduleCleanUpTask(mockServerSetup)).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
