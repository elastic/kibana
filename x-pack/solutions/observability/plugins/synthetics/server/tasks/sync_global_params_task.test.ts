/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  asyncGlobalParamsPropagation,
  SyncGlobalParamsPrivateLocationsTask,
} from './sync_global_params_task';
import * as getPrivateLocationsModule from '../synthetics_service/get_private_locations';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';

describe('asyncGlobalParamsPropagation', () => {
  const FIXED_NOW = 1_000_000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('schedules a task for each provided space', async () => {
    const ensureScheduled = jest.fn().mockResolvedValue(undefined);
    const server = { pluginsStart: { taskManager: { ensureScheduled } } } as any;
    const spaces = ['space-a', 'space-b'];

    await asyncGlobalParamsPropagation({ server, paramsSpacesToSync: spaces });

    expect(ensureScheduled).toHaveBeenCalledTimes(spaces.length);

    const expectedRunAt = new Date(FIXED_NOW + 3 * 1000).getTime();
    const calls = ensureScheduled.mock.calls.map((c) => c[0]);

    for (let i = 0; i < spaces.length; i++) {
      const scheduled = calls[i];
      expect(scheduled.taskType).toBe('Synthetics:Sync-Global-Params-Private-Locations');
      expect(scheduled.params).toEqual({});
      expect(scheduled.state).toEqual({ paramsSpaceToSync: spaces[i] });
      expect(scheduled.id).toMatch(/^Synthetics:Sync-Global-Params-Private-Locations:/);
      expect(scheduled.runAt).toBeInstanceOf(Date);
      // small allowance for Date object creation
      expect(Math.abs(scheduled.runAt.getTime() - expectedRunAt)).toBeLessThan(50);
    }
  });

  test('when ALL_SPACES_ID present only schedules for ALL_SPACES_ID', async () => {
    const ensureScheduled = jest.fn().mockResolvedValue(undefined);
    const server = { pluginsStart: { taskManager: { ensureScheduled } } } as any;
    const spaces = [ALL_SPACES_ID, 'other-space'];

    await asyncGlobalParamsPropagation({ server, paramsSpacesToSync: spaces });

    expect(ensureScheduled).toHaveBeenCalledTimes(1);
    const scheduled = ensureScheduled.mock.calls[0][0];
    expect(scheduled.state).toEqual({ paramsSpaceToSync: ALL_SPACES_ID });
    expect(scheduled.taskType).toBe('Synthetics:Sync-Global-Params-Private-Locations');
  });
});

describe('SyncGlobalParamsPrivateLocationsTask.runTask', () => {
  const buildTask = ({ editMonitors }: { editMonitors: jest.Mock }) => {
    const serverSetup = {
      coreStart: { savedObjects: { createInternalRepository: jest.fn().mockReturnValue({}) } },
      encryptedSavedObjects: {},
      fleet: { runWithCache: (fn: () => Promise<unknown>) => fn() },
      logger: { error: jest.fn(), debug: jest.fn() },
    } as any;
    const task = new SyncGlobalParamsPrivateLocationsTask(
      serverSetup,
      {} as any,
      {
        privateLocationAPI: { editMonitors },
      } as any
    );

    jest
      .spyOn(getPrivateLocationsModule, 'getPrivateLocations')
      .mockResolvedValue([{ id: 'pl-1' }] as any);
    jest.spyOn(task.deployPackagePolicies, 'getAllMonitorConfigs').mockResolvedValue({
      configsBySpaces: { space1: [{ id: 'm1' }] },
      monitorSpaceIds: new Set(['space1']),
      paramsBySpace: {},
      maintenanceWindows: [],
    } as any);
    jest
      .spyOn(task.deployPackagePolicies, 'parseLocations')
      .mockReturnValue({ privateLocations: [{ id: 'pl-1' }], publicLocations: [] } as any);

    return { task, serverSetup };
  };

  const taskInstance = { state: { paramsSpaceToSync: 'space1' } } as any;

  test('does not fail the task when some package policies could not be created', async () => {
    const editMonitors = jest
      .fn()
      .mockResolvedValue({ failedUpdates: [], failedCreates: [{ packagePolicy: { id: 'p1' } }] });
    const { task, serverSetup } = buildTask({ editMonitors });

    // a single broken monitor must not make the whole space's param propagation
    // fail and re-run; the deploy layer logs it instead
    await expect(task.runTask({ taskInstance })).resolves.toBeUndefined();
    expect(serverSetup.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create policies during sync')
    );
  });

  test('still fails the task when the sync itself throws', async () => {
    const editMonitors = jest.fn().mockRejectedValue(new Error('boom'));
    const { task } = buildTask({ editMonitors });

    const result = await task.runTask({ taskInstance });

    expect(result?.error).toBeDefined();
  });
});
