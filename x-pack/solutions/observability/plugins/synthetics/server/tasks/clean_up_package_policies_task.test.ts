/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { createFleetStartContractMock } from '@kbn/fleet-plugin/server/mocks';
import type { SyntheticsServerSetup } from '../types';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import { deletePackagePolicies, findLeftoverPackagePolicies } from './clean_up_duplicate_policies';
import { runTaskPerPrivateLocation } from './sync_private_locations_monitors_task';
import { getFilterForTestNowRun } from './test_now_run_filter';
import {
  SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
  SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
  ensureCleanUpTaskScheduled,
  registerCleanUpTask,
  runCleanUpTask,
  runCleanUpTaskNow,
  scheduleTestNowCleanUp,
  setLeftoverCleanUpDisabled,
} from './clean_up_package_policies_task';

// No requireActual: the real module imports back into the task through
// synthetics_private_location, which would bind the task to the unmocked functions.
jest.mock('./clean_up_duplicate_policies', () => ({
  PACKAGE_POLICY_SCAN_PAGE_SIZE: 5000,
  findLeftoverPackagePolicies: jest.fn(),
  deletePackagePolicies: jest.fn(),
}));

jest.mock('../synthetics_service/get_private_locations', () => ({
  getPrivateLocations: jest.fn(),
}));

jest.mock('./sync_private_locations_monitors_task', () => ({
  ...jest.requireActual('./sync_private_locations_monitors_task'),
  runTaskPerPrivateLocation: jest.fn(),
}));

const findLeftoverPackagePoliciesMock = findLeftoverPackagePolicies as jest.MockedFunction<
  typeof findLeftoverPackagePolicies
>;
const deletePackagePoliciesMock = deletePackagePolicies as jest.MockedFunction<
  typeof deletePackagePolicies
>;
const getPrivateLocationsMock = getPrivateLocations as jest.MockedFunction<
  typeof getPrivateLocations
>;
const runTaskPerPrivateLocationMock = runTaskPerPrivateLocation as jest.MockedFunction<
  typeof runTaskPerPrivateLocation
>;

const MINUTE = 60 * 1000;

const taskManagerSetup = taskManagerMock.createSetup();
const taskManager = taskManagerMock.createStart();
const logger = loggerMock.create();
const fleet = createFleetStartContractMock();
const soClient = {};
const esClient = {};

const server = {
  coreStart: {
    elasticsearch: { client: { asInternalUser: esClient } },
    savedObjects: { createInternalRepository: jest.fn().mockReturnValue(soClient) },
  },
  pluginsStart: { taskManager, fleet },
  fleet: { runWithCache: jest.fn((fn: () => Promise<unknown>) => fn()) },
  logger,
} as unknown as SyntheticsServerSetup;

const taskInstance = ({
  params = {},
  state = {},
}: { params?: Record<string, unknown>; state?: Record<string, unknown> } = {}) =>
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
    state,
    params,
  } as const);

const expiredTestNowIds = (ids: string[]) =>
  fleet.packagePolicyService.fetchAllItemIds.mockResolvedValue(
    (async function* () {
      yield ids;
    })()
  );

describe('clean up package policies task', () => {
  const signal = new AbortController().signal;

  beforeEach(() => {
    jest.clearAllMocks();
    expiredTestNowIds([]);
    findLeftoverPackagePoliciesMock.mockResolvedValue({ leftoverIds: [], missingLocationIds: [] });
    deletePackagePoliciesMock.mockResolvedValue(undefined);
    getPrivateLocationsMock.mockResolvedValue([]);
    runTaskPerPrivateLocationMock.mockResolvedValue(undefined);
    taskManager.ensureScheduled.mockResolvedValue({
      id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
      schedule: { interval: '24h' },
    } as any);
    taskManager.runSoon.mockResolvedValue({ id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID } as any);
    taskManager.bulkUpdateState.mockResolvedValue({ tasks: [], errors: [] });
  });

  it('registers the task with a validated package policy id param', () => {
    registerCleanUpTask(taskManagerSetup as any, server);

    expect(taskManagerSetup.registerTaskDefinitions).toHaveBeenCalledWith({
      [SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE]: expect.objectContaining({
        timeout: '10m',
        maxAttempts: 3,
        paramsSchema: expect.anything(),
      }),
    });
  });

  it('runs inside the Fleet cache', async () => {
    registerCleanUpTask(taskManagerSetup as any, server);
    const [[definitions]] = taskManagerSetup.registerTaskDefinitions.mock.calls;
    const { createTaskRunner } = definitions[SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE];

    await createTaskRunner({
      taskInstance: taskInstance({ params: { packagePolicyIds: ['tn-1'] } }),
      signal,
    } as any).run();

    expect(server.fleet.runWithCache).toHaveBeenCalledTimes(1);
    expect(deletePackagePoliciesMock).toHaveBeenCalledWith(
      ['tn-1'],
      soClient,
      esClient,
      server,
      signal
    );
  });

  describe('Test Now run', () => {
    it('deletes exactly the package policies it was scheduled with', async () => {
      await runCleanUpTask(
        server,
        taskInstance({ params: { packagePolicyIds: ['tn-1', 'tn-2'] } }) as any,
        signal
      );

      expect(deletePackagePoliciesMock).toHaveBeenCalledWith(
        ['tn-1', 'tn-2'],
        soClient,
        esClient,
        server,
        signal
      );
      expect(findLeftoverPackagePoliciesMock).not.toHaveBeenCalled();
    });

    it('returns no schedule so it never recurs', async () => {
      const result = await runCleanUpTask(
        server,
        taskInstance({ params: { packagePolicyIds: ['tn-1'] } }) as any,
        signal
      );

      expect(result).toEqual({ state: {} });
    });

    it('lets a failed delete throw so task manager retries it', async () => {
      deletePackagePoliciesMock.mockRejectedValue(new Error('fleet unavailable'));

      await expect(
        runCleanUpTask(
          server,
          taskInstance({ params: { packagePolicyIds: ['tn-1'] } }) as any,
          signal
        )
      ).rejects.toThrow('fleet unavailable');
    });
  });

  describe('daily run', () => {
    it('deletes expired Test Now policies and leftovers together', async () => {
      expiredTestNowIds(['tn-old']);
      findLeftoverPackagePoliciesMock.mockResolvedValue({
        leftoverIds: ['m1-loc1-default'],
        missingLocationIds: [],
      });

      await runCleanUpTask(server, taskInstance() as any, signal);

      expect(deletePackagePoliciesMock).toHaveBeenCalledWith(
        ['tn-old', 'm1-loc1-default'],
        soClient,
        esClient,
        server,
        signal
      );
    });

    it('sweeps Test Now policies older than their clean up delay in every space', async () => {
      const before = Date.now();

      await runCleanUpTask(server, taskInstance() as any, signal);

      const [, options] = fleet.packagePolicyService.fetchAllItemIds.mock.calls[0];
      expect(options?.spaceIds).toEqual(['*']);
      expect(options?.kuery).toContain(getFilterForTestNowRun());
      const cutoff = Date.parse(options?.kuery?.match(/created_at < "([^"]+)"/)?.[1] ?? '');
      // never sooner than the one-shot, which may still be waiting on the run
      expect(cutoff).toBeLessThanOrEqual(before - 20 * MINUTE + 1000);
      expect(cutoff).toBeGreaterThan(before - 21 * MINUTE);
    });

    it('recreates only at existing locations that have a missing policy', async () => {
      findLeftoverPackagePoliciesMock.mockResolvedValue({
        leftoverIds: [],
        missingLocationIds: ['pl-2', 'deleted-location'],
      });
      getPrivateLocationsMock.mockResolvedValue([{ id: 'pl-1' }, { id: 'pl-2' }] as any);

      await runCleanUpTask(server, taskInstance() as any, signal);

      expect(runTaskPerPrivateLocationMock).toHaveBeenCalledTimes(1);
      expect(runTaskPerPrivateLocationMock).toHaveBeenCalledWith({
        server,
        privateLocationId: 'pl-2',
      });
    });

    it('does not look up locations when nothing is missing', async () => {
      await runCleanUpTask(server, taskInstance() as any, signal);

      expect(getPrivateLocationsMock).not.toHaveBeenCalled();
      expect(runTaskPerPrivateLocationMock).not.toHaveBeenCalled();
    });

    it('runs daily and keeps no state between runs', async () => {
      const result = await runCleanUpTask(
        server,
        taskInstance({
          state: { failedAgentPolicyBumps: ['agent-a'], lastLeftoverScanAt: 'x' },
        }) as any,
        signal
      );

      expect(result).toEqual({ state: {}, schedule: { interval: '24h' } });
    });

    describe('when leftover clean up is disabled', () => {
      const disabledInstance = () => taskInstance({ state: { leftoverCleanUpDisabled: true } });

      it('still deletes expired Test Now policies but leaves leftovers alone', async () => {
        expiredTestNowIds(['tn-old']);

        await runCleanUpTask(server, disabledInstance() as any, signal);

        expect(findLeftoverPackagePoliciesMock).not.toHaveBeenCalled();
        expect(runTaskPerPrivateLocationMock).not.toHaveBeenCalled();
        expect(deletePackagePoliciesMock).toHaveBeenCalledWith(
          ['tn-old'],
          soClient,
          esClient,
          server,
          signal
        );
      });

      it('keeps the opt-out for the next daily run', async () => {
        const result = await runCleanUpTask(server, disabledInstance() as any, signal);

        expect(result).toEqual({
          state: { leftoverCleanUpDisabled: true },
          schedule: { interval: '24h' },
        });
      });
    });

    it('still reschedules daily when the run fails', async () => {
      findLeftoverPackagePoliciesMock.mockRejectedValue(new Error('scan failed'));

      const result = await runCleanUpTask(server, taskInstance() as any, signal);

      expect(logger.error).toHaveBeenCalled();
      expect(result).toEqual({ state: {}, schedule: { interval: '24h' } });
    });
  });

  describe('scheduleTestNowCleanUp', () => {
    it('schedules a one-shot run with the created policy ids after 20 minutes', async () => {
      const before = Date.now();

      // the same delay for every monitor type, so a slow deploy never cuts a
      // lightweight run short
      await scheduleTestNowCleanUp(server, [{ id: 'tn-1' }, { id: 'tn-2' }]);

      expect(taskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
          params: { packagePolicyIds: ['tn-1', 'tn-2'] },
          state: {},
        })
      );
      const [scheduled] = taskManager.schedule.mock.calls[0];
      expect(scheduled).not.toHaveProperty('id');
      expect(scheduled.runAt!.getTime()).toBeGreaterThanOrEqual(before + 20 * MINUTE);
    });

    it('schedules nothing when no policies were created', async () => {
      await scheduleTestNowCleanUp(server, []);

      expect(taskManager.schedule).not.toHaveBeenCalled();
    });

    it('logs instead of throwing when scheduling fails', async () => {
      taskManager.schedule.mockRejectedValue(new Error('task manager unavailable'));

      await expect(scheduleTestNowCleanUp(server, [{ id: 'tn-1' }])).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  it('ensureCleanUpTaskScheduled schedules the daily task without running it', async () => {
    await ensureCleanUpTaskScheduled(server);

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
        taskType: SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
        schedule: { interval: '24h' },
      })
    );
    expect(taskManager.runSoon).not.toHaveBeenCalled();
  });

  it('runCleanUpTaskNow runs the daily task immediately', async () => {
    await runCleanUpTaskNow(server);

    expect(taskManager.ensureScheduled).toHaveBeenCalled();
    expect(taskManager.runSoon).toHaveBeenCalledWith(SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID);
  });

  describe('setLeftoverCleanUpDisabled', () => {
    it.each([true, false])(
      'stores leftoverCleanUpDisabled=%s on the daily task, keeping the rest of its state',
      async (leftoverCleanUpDisabled) => {
        await setLeftoverCleanUpDisabled(server, leftoverCleanUpDisabled);

        expect(taskManager.ensureScheduled).toHaveBeenCalled();
        const [ids, mapState] = taskManager.bulkUpdateState.mock.calls[0];
        expect(ids).toEqual([SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID]);
        expect(mapState({ other: 'x' }, SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID)).toEqual({
          other: 'x',
          leftoverCleanUpDisabled,
        });
        expect(taskManager.runSoon).not.toHaveBeenCalled();
      }
    );

    it('throws when the state update fails', async () => {
      taskManager.bulkUpdateState.mockResolvedValue({
        tasks: [],
        errors: [
          {
            type: 'task',
            id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
            error: { error: 'Conflict', message: 'version conflict', statusCode: 409 },
          },
        ],
      });

      await expect(setLeftoverCleanUpDisabled(server, true)).rejects.toThrow(/version conflict/);
    });
  });

  it('runCleanUpTaskNow throws when runSoon reports a conflict', async () => {
    taskManager.runSoon.mockResolvedValue({
      id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
      conflict: true,
    } as any);

    await expect(runCleanUpTaskNow(server)).rejects.toThrow(/conflict/);
  });
});
