/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncGlobalParamsPropagation } from './sync_global_params_task';
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
