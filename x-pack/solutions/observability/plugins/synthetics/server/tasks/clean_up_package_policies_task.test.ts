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
import {
  bumpAgentPolicyRevisions,
  cleanUpDuplicatedPackagePolicies,
} from './clean_up_duplicate_policies';
import {
  DEFAULT_MAX_CLEANUP_RETRIES,
  LEFTOVER_CLEANUP_SCAN_VERSION,
  runTaskPerPrivateLocation,
} from './sync_private_locations_monitors_task';
import {
  MAX_FAILED_BUMP_FAST_RETRIES,
  TEST_NOW_LIST_PAGE_SIZE,
  ensureCleanUpTaskScheduled,
  registerCleanUpTask,
  runCleanUpPackagePoliciesTask,
  scheduleCleanUpTask,
  triggerCleanUpPackagePoliciesTask,
  SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
  SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
} from './clean_up_package_policies_task';

jest.mock('./clean_up_duplicate_policies', () => ({
  cleanUpDuplicatedPackagePolicies: jest.fn(),
  bumpAgentPolicyRevisions: jest.fn(),
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
const bumpAgentPolicyRevisionsMock = bumpAgentPolicyRevisions as jest.MockedFunction<
  typeof bumpAgentPolicyRevisions
>;
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
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({
      performCleanupSync: false,
      failedAgentPolicyIds: [],
      attemptedAgentPolicyIds: [],
    });
    bumpAgentPolicyRevisionsMock.mockResolvedValue([]);
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

  it('scans leftovers with a fresh unlatched state even if task state looks latched', async () => {
    const taskInstance = {
      ...getTaskInstance(),
      state: { hasAlreadyDoneCleanup: true, cleanupScanVersion: LEFTOVER_CLEANUP_SCAN_VERSION },
    };

    await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(cleanUpDuplicatedPackagePoliciesMock).toHaveBeenCalledWith(
      mockServerSetup,
      mockSoClient,
      expect.objectContaining({
        hasAlreadyDoneCleanup: false,
        maxCleanUpRetries: DEFAULT_MAX_CLEANUP_RETRIES,
        cleanupScanVersion: LEFTOVER_CLEANUP_SCAN_VERSION,
      })
    );
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

  it('deletes expired Test Now policies past the first page', async () => {
    const expired = moment().subtract(20, 'minutes').toISOString();
    const firstPage = Array.from({ length: TEST_NOW_LIST_PAGE_SIZE }, (_, i) => ({
      id: `browser-${i}`,
      name: BROWSER_TEST_NOW_RUN,
      created_at: expired,
    }));
    mockFleet.packagePolicyService.list
      .mockResolvedValueOnce({
        items: firstPage,
        total: TEST_NOW_LIST_PAGE_SIZE + 1,
      } as any)
      .mockResolvedValueOnce({
        items: [{ id: 'browser-last', name: BROWSER_TEST_NOW_RUN, created_at: expired }],
        total: TEST_NOW_LIST_PAGE_SIZE + 1,
      } as any);

    await runCleanUpPackagePoliciesTask(mockServerSetup, getTaskInstance() as any);

    expect(mockFleet.packagePolicyService.list).toHaveBeenCalledTimes(2);
    expect(mockFleet.packagePolicyService.list).toHaveBeenLastCalledWith(
      mockSoClient,
      expect.objectContaining({ page: 2, perPage: TEST_NOW_LIST_PAGE_SIZE })
    );
    expect(mockFleet.packagePolicyService.delete).toHaveBeenCalledWith(
      mockSoClient,
      {},
      expect.arrayContaining(['browser-0', 'browser-last']),
      { force: true }
    );
  });

  it('schedules a per-location sync after leftover deletes', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({
      performCleanupSync: true,
      failedAgentPolicyIds: [],
      attemptedAgentPolicyIds: [],
    });
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
    expect(result.schedule).toEqual({ interval: '20m' });
  });

  it('carries the leftover recreate budget over to the next run', async () => {
    // the scan mutates the state it is handed, so record the budget it was given
    const budgetsSeen: number[] = [];
    cleanUpDuplicatedPackagePoliciesMock.mockImplementation(async (_server, _soClient, state) => {
      budgetsSeen.push(state.maxCleanUpRetries);
      state.maxCleanUpRetries -= 1;
      return {
        performCleanupSync: true,
        failedAgentPolicyIds: [],
        attemptedAgentPolicyIds: [],
      };
    });
    getPrivateLocationsMock.mockResolvedValue([{ id: 'pl-1' }] as any);

    const first = await runCleanUpPackagePoliciesTask(mockServerSetup, getTaskInstance() as any);

    expect(first.state.leftoverRecreateRetries).toBe(DEFAULT_MAX_CLEANUP_RETRIES - 1);

    const second = await runCleanUpPackagePoliciesTask(mockServerSetup, {
      ...getTaskInstance(),
      state: first.state,
    } as any);

    expect(budgetsSeen).toEqual([DEFAULT_MAX_CLEANUP_RETRIES, DEFAULT_MAX_CLEANUP_RETRIES - 1]);
    expect(second.state.leftoverRecreateRetries).toBe(DEFAULT_MAX_CLEANUP_RETRIES - 2);
  });

  it('restores the persisted recreate budget when the scan makes progress', async () => {
    const budgetsSeen: number[] = [];
    cleanUpDuplicatedPackagePoliciesMock.mockImplementation(async (_server, _soClient, state) => {
      budgetsSeen.push(state.maxCleanUpRetries);
      state.maxCleanUpRetries = DEFAULT_MAX_CLEANUP_RETRIES;
      return {
        performCleanupSync: false,
        failedAgentPolicyIds: [],
        attemptedAgentPolicyIds: [],
      };
    });
    const taskInstance = {
      ...getTaskInstance(),
      state: { leftoverRecreateRetries: 1 },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(budgetsSeen).toEqual([1]);
    expect(result.state.leftoverRecreateRetries).toBe(DEFAULT_MAX_CLEANUP_RETRIES);
  });

  it('comes back in 20m while the leftover scan still wants a recreate', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({
      performCleanupSync: true,
      failedAgentPolicyIds: [],
      attemptedAgentPolicyIds: [],
    });
    getPrivateLocationsMock.mockResolvedValue([{ id: 'pl-1' }] as any);

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, getTaskInstance() as any);

    expect(result.schedule).toEqual({ interval: '20m' });
  });

  it('does not schedule per-location sync when leftover scan finds nothing to recreate', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({
      performCleanupSync: false,
      failedAgentPolicyIds: [],
      attemptedAgentPolicyIds: [],
    });

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

  it('persists failed leftover bumps and comes back in 20m', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({
      performCleanupSync: true,
      failedAgentPolicyIds: ['agent-a'],
      attemptedAgentPolicyIds: ['agent-a'],
    });
    getPrivateLocationsMock.mockResolvedValue([{ id: 'pl-1' }] as any);

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, getTaskInstance() as any);

    expect(result.state.failedAgentPolicyBumps).toEqual(['agent-a']);
    expect(result.state.failedBumpFastRetries).toBe(MAX_FAILED_BUMP_FAST_RETRIES);
    expect(result.schedule).toEqual({ interval: '20m' });
    expect(bumpAgentPolicyRevisionsMock).not.toHaveBeenCalled();
  });

  it('retries previously failed bumps on the next run', async () => {
    const taskInstance = {
      ...getTaskInstance(),
      state: { failedAgentPolicyBumps: ['agent-a'], failedBumpFastRetries: 0 },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(bumpAgentPolicyRevisionsMock).toHaveBeenCalledWith(['agent-a'], mockServerSetup);
    expect(result.state.failedAgentPolicyBumps).toEqual([]);
    expect(result.schedule).toEqual({ interval: '24h' });
  });

  it('does not re-bump a policy the leftover scan already attempted', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({
      performCleanupSync: false,
      failedAgentPolicyIds: ['agent-a'],
      attemptedAgentPolicyIds: ['agent-a'],
    });
    const taskInstance = {
      ...getTaskInstance(),
      state: { failedAgentPolicyBumps: ['agent-a'] },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(bumpAgentPolicyRevisionsMock).not.toHaveBeenCalled();
    expect(result.state.failedAgentPolicyBumps).toEqual(['agent-a']);
    expect(result.state.failedBumpFastRetries).toBe(0);
    expect(result.schedule).toEqual({ interval: '24h' });
  });

  it('skips leftover scan on 20m bump retries and decrements the fast budget', async () => {
    bumpAgentPolicyRevisionsMock.mockResolvedValue(['agent-a']);
    const taskInstance = {
      ...getTaskInstance(),
      state: {
        failedAgentPolicyBumps: ['agent-a'],
        failedBumpFastRetries: MAX_FAILED_BUMP_FAST_RETRIES,
      },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(cleanUpDuplicatedPackagePoliciesMock).not.toHaveBeenCalled();
    expect(bumpAgentPolicyRevisionsMock).toHaveBeenCalledWith(['agent-a'], mockServerSetup);
    expect(result.state.failedAgentPolicyBumps).toEqual(['agent-a']);
    expect(result.state.failedBumpFastRetries).toBe(MAX_FAILED_BUMP_FAST_RETRIES - 1);
    expect(result.schedule).toEqual({ interval: '20m' });
  });

  it('moves stuck bump retries to 24h after the fast budget is spent', async () => {
    bumpAgentPolicyRevisionsMock.mockResolvedValue(['agent-a']);
    const taskInstance = {
      ...getTaskInstance(),
      state: { failedAgentPolicyBumps: ['agent-a'], failedBumpFastRetries: 1 },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(cleanUpDuplicatedPackagePoliciesMock).not.toHaveBeenCalled();
    expect(result.state.failedAgentPolicyBumps).toEqual(['agent-a']);
    expect(result.state.failedBumpFastRetries).toBe(0);
    expect(result.schedule).toEqual({ interval: '24h' });
  });

  it('still retries bumps on the 24h leftover scan after fast retries are spent', async () => {
    bumpAgentPolicyRevisionsMock.mockResolvedValue(['agent-a']);
    const taskInstance = {
      ...getTaskInstance(),
      state: { failedAgentPolicyBumps: ['agent-a'], failedBumpFastRetries: 0 },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(cleanUpDuplicatedPackagePoliciesMock).toHaveBeenCalled();
    expect(bumpAgentPolicyRevisionsMock).toHaveBeenCalledWith(['agent-a'], mockServerSetup);
    expect(result.state.failedAgentPolicyBumps).toEqual(['agent-a']);
    expect(result.state.failedBumpFastRetries).toBe(0);
    expect(result.schedule).toEqual({ interval: '24h' });
  });

  it('resets the 20m bump budget when leftover scan finds a new failed policy', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({
      performCleanupSync: false,
      failedAgentPolicyIds: ['agent-b'],
      attemptedAgentPolicyIds: ['agent-b'],
    });
    const taskInstance = {
      ...getTaskInstance(),
      state: { failedAgentPolicyBumps: ['agent-a'], failedBumpFastRetries: 0 },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(result.state.failedAgentPolicyBumps).toEqual(['agent-b']);
    expect(result.state.failedBumpFastRetries).toBe(MAX_FAILED_BUMP_FAST_RETRIES);
    expect(result.schedule).toEqual({ interval: '20m' });
  });

  it('keeps a failed bump in state when the next-run retry still fails', async () => {
    bumpAgentPolicyRevisionsMock.mockResolvedValue(['agent-a']);
    const taskInstance = {
      ...getTaskInstance(),
      state: {
        failedAgentPolicyBumps: ['agent-a'],
        failedBumpFastRetries: MAX_FAILED_BUMP_FAST_RETRIES,
      },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(result.state.failedAgentPolicyBumps).toEqual(['agent-a']);
    expect(result.schedule).toEqual({ interval: '20m' });
  });

  it('retries previously failed bumps even when the leftover scan throws', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockRejectedValue(new Error('scan failed'));
    const taskInstance = {
      ...getTaskInstance(),
      state: { failedAgentPolicyBumps: ['agent-a'] },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(bumpAgentPolicyRevisionsMock).toHaveBeenCalledWith(['agent-a'], mockServerSetup);
    expect(result.state.failedAgentPolicyBumps).toEqual([]);
    expect(result.schedule).toEqual({ interval: '24h' });
  });

  it('ignores invalid persisted failed bump state', async () => {
    const taskInstance = {
      ...getTaskInstance(),
      state: { failedAgentPolicyBumps: 'agent-a' },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(bumpAgentPolicyRevisionsMock).not.toHaveBeenCalled();
    expect(result.state.failedAgentPolicyBumps).toEqual([]);
    expect(result.schedule).toEqual({ interval: '24h' });
  });

  it('retries only the previous failures the leftover scan did not already attempt', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({
      performCleanupSync: false,
      failedAgentPolicyIds: ['agent-a'],
      attemptedAgentPolicyIds: ['agent-a'],
    });
    bumpAgentPolicyRevisionsMock.mockResolvedValue([]);
    const taskInstance = {
      ...getTaskInstance(),
      state: { failedAgentPolicyBumps: ['agent-a', 'agent-b', ''] },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(bumpAgentPolicyRevisionsMock).toHaveBeenCalledWith(['agent-b'], mockServerSetup);
    expect(result.state.failedAgentPolicyBumps).toEqual(['agent-a']);
    expect(result.state.failedBumpFastRetries).toBe(0);
    expect(result.schedule).toEqual({ interval: '24h' });
  });

  it('keeps leftover and retry failures from different agent policies', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({
      performCleanupSync: true,
      failedAgentPolicyIds: ['agent-a'],
      attemptedAgentPolicyIds: ['agent-a'],
    });
    bumpAgentPolicyRevisionsMock.mockResolvedValue(['agent-b']);
    getPrivateLocationsMock.mockResolvedValue([{ id: 'pl-1' }] as any);
    const taskInstance = {
      ...getTaskInstance(),
      state: { failedAgentPolicyBumps: ['agent-b'] },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(runTaskPerPrivateLocationMock).toHaveBeenCalledWith({
      server: mockServerSetup,
      privateLocationId: 'pl-1',
    });
    expect(bumpAgentPolicyRevisionsMock).toHaveBeenCalledWith(['agent-b'], mockServerSetup);
    expect(result.state.failedAgentPolicyBumps).toEqual(['agent-a', 'agent-b']);
    expect(result.state.failedBumpFastRetries).toBe(MAX_FAILED_BUMP_FAST_RETRIES);
    expect(result.schedule).toEqual({ interval: '20m' });
  });

  it('retries previously failed bumps when per-location sync throws', async () => {
    cleanUpDuplicatedPackagePoliciesMock.mockResolvedValue({
      performCleanupSync: true,
      failedAgentPolicyIds: [],
      attemptedAgentPolicyIds: [],
    });
    getPrivateLocationsMock.mockResolvedValue([{ id: 'pl-1' }] as any);
    runTaskPerPrivateLocationMock.mockRejectedValue(new Error('sync failed'));
    const taskInstance = {
      ...getTaskInstance(),
      state: { failedAgentPolicyBumps: ['agent-z'] },
    };

    const result = await runCleanUpPackagePoliciesTask(mockServerSetup, taskInstance as any);

    expect(mockLogger.error).toHaveBeenCalled();
    expect(bumpAgentPolicyRevisionsMock).toHaveBeenCalledWith(['agent-z'], mockServerSetup);
    expect(result.state.failedAgentPolicyBumps).toEqual([]);
    // the recreate is still outstanding, so do not wait a full day to re-check
    expect(result.schedule).toEqual({ interval: '20m' });
  });

  it('skips leftover work when elasticsearch is unavailable', async () => {
    const server = {
      ...mockServerSetup,
      coreStart: {
        ...mockServerSetup.coreStart,
        elasticsearch: { client: { asInternalUser: undefined } },
      },
    };
    const taskInstance = {
      ...getTaskInstance(),
      state: { failedAgentPolicyBumps: ['agent-a'] },
    };

    const result = await runCleanUpPackagePoliciesTask(server as any, taskInstance as any);

    expect(cleanUpDuplicatedPackagePoliciesMock).not.toHaveBeenCalled();
    expect(result.state.failedAgentPolicyBumps).toEqual(['agent-a']);
    expect(result.schedule).toEqual({ interval: '60m' });
  });

  it('ensureCleanUpTaskScheduled schedules the task without forcing an immediate run', async () => {
    await ensureCleanUpTaskScheduled(mockServerSetup);

    expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
        taskType: SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
      })
    );
    expect(mockTaskManagerStart.runSoon).not.toHaveBeenCalled();
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

  it('triggerCleanUpPackagePoliciesTask clears the skip conditions before running', async () => {
    await triggerCleanUpPackagePoliciesTask(mockServerSetup);

    expect(mockTaskManagerStart.bulkUpdateState).toHaveBeenCalledWith(
      [SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID],
      expect.any(Function)
    );
    const updater = mockTaskManagerStart.bulkUpdateState.mock.calls[0][1] as (
      state: Record<string, unknown>
    ) => Record<string, unknown>;
    expect(updater({ failedAgentPolicyBumps: ['agent-a'], failedBumpFastRetries: 3 })).toEqual({
      failedAgentPolicyBumps: ['agent-a'],
      failedBumpFastRetries: 0,
      leftoverRecreateRetries: DEFAULT_MAX_CLEANUP_RETRIES,
    });
  });

  it('triggerCleanUpPackagePoliciesTask throws when runSoon reports a conflict', async () => {
    mockTaskManagerStart.runSoon.mockResolvedValue({
      id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
      conflict: true,
    } as any);

    await expect(triggerCleanUpPackagePoliciesTask(mockServerSetup)).rejects.toThrow(
      /could not be scheduled to run now/
    );
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
