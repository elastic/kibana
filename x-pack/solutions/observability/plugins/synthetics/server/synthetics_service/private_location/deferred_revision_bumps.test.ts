/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeferredRevisionBumps } from './deferred_revision_bumps';

describe('DeferredRevisionBumps', () => {
  it('does not bump until flushed, then bumps each policy once', async () => {
    const schedule = jest.fn().mockResolvedValue(undefined);
    const deferredBumps = new DeferredRevisionBumps(schedule);

    await deferredBumps.add(['policy-1', 'policy-2']);
    await deferredBumps.add(['policy-2', 'policy-3']);
    expect(schedule).not.toHaveBeenCalled();

    await deferredBumps.flush();

    expect(schedule).toHaveBeenCalledTimes(3);
    expect(schedule.mock.calls.map(([ids]) => ids)).toEqual([
      ['policy-1'],
      ['policy-2'],
      ['policy-3'],
    ]);
  });

  it('does nothing when nothing was collected', async () => {
    const schedule = jest.fn().mockResolvedValue(undefined);

    await new DeferredRevisionBumps(schedule).flush();

    expect(schedule).not.toHaveBeenCalled();
  });

  it('attempts every policy when one fails, then reports the failures together', async () => {
    const schedule = jest
      .fn()
      .mockImplementation((ids: string[]) =>
        ids[0] === 'policy-2' ? Promise.reject(new Error('fleet down')) : Promise.resolve()
      );
    const deferredBumps = new DeferredRevisionBumps(schedule);
    await deferredBumps.add(['policy-1', 'policy-2', 'policy-3']);

    await expect(deferredBumps.flush()).rejects.toThrow(
      'Failed to bump the revision of 1 of 3 agent policies [policy-2]: fleet down'
    );

    expect(schedule).toHaveBeenCalledTimes(3);
  });

  it('bumps right away when a write finishes after the flush', async () => {
    const schedule = jest.fn().mockResolvedValue(undefined);
    const deferredBumps = new DeferredRevisionBumps(schedule);
    await deferredBumps.add(['policy-1']);
    await deferredBumps.flush();
    schedule.mockClear();

    // e.g. a sibling write still awaiting Fleet after another branch rejected
    await deferredBumps.add(['policy-late']);

    expect(schedule).toHaveBeenCalledWith(['policy-late']);
  });

  it('does not bump a policy twice across flushes', async () => {
    const schedule = jest.fn().mockResolvedValue(undefined);
    const deferredBumps = new DeferredRevisionBumps(schedule);
    await deferredBumps.add(['policy-1']);

    await deferredBumps.flush();
    await deferredBumps.flush();

    expect(schedule).toHaveBeenCalledTimes(1);
  });
});
