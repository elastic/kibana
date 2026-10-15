/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SpaceSnapshot } from '../../telemetry/snapshot';
import { collectSpaceSnapshots } from './collect_space_snapshots';

const snapshotFor = (spaceId: string): SpaceSnapshot => ({
  flags: {
    'securitySolution.attackDiscoveryWorkflowsEnabled': false,
    'securitySolution:enableAlertZero': spaceId === 'default',
    'securitySolution:enableAttackDiscoveryWorkflows': false,
  },
  workers: [],
});

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('collectSpaceSnapshots', () => {
  it('collects every space', async () => {
    const result = await collectSpaceSnapshots({
      collect: async (spaceId) => snapshotFor(spaceId),
      concurrency: 2,
      logger: loggerMock.create(),
      signal: new AbortController().signal,
      spaceIds: ['default', 'space-a', 'space-b'],
    });

    expect(result).toEqual({
      aborted: false,
      failedSpaceCount: 0,
      snapshots: [snapshotFor('default'), snapshotFor('space-a'), snapshotFor('space-b')],
    });
  });

  it('never reads more spaces at once than the concurrency bound', async () => {
    const releases: Array<() => void> = [];
    const inFlight = { current: 0, max: 0 };
    const collect = jest.fn(async (spaceId: string) => {
      inFlight.current += 1;
      inFlight.max = Math.max(inFlight.max, inFlight.current);
      await new Promise<void>((resolve) => releases.push(resolve));
      inFlight.current -= 1;
      return snapshotFor(spaceId);
    });

    const pending = collectSpaceSnapshots({
      collect,
      concurrency: 2,
      logger: loggerMock.create(),
      signal: new AbortController().signal,
      spaceIds: ['s1', 's2', 's3', 's4', 's5'],
    });

    await flushPromises();
    expect(collect).toHaveBeenCalledTimes(2);

    // Release one space at a time; the next one starts only after a slot frees up.
    for (let released = 0; released < 5; released++) {
      releases[released]();
      await flushPromises();
    }

    const result = await pending;
    expect(inFlight.max).toBe(2);
    expect(collect).toHaveBeenCalledTimes(5);
    expect(result.snapshots).toHaveLength(5);
  });

  it('leaves a space that fails out of the snapshot and counts it', async () => {
    const logger = loggerMock.create();

    const result = await collectSpaceSnapshots({
      collect: async (spaceId) => {
        if (spaceId === 'space-a') {
          throw new Error('es down');
        }
        return snapshotFor(spaceId);
      },
      concurrency: 2,
      logger,
      signal: new AbortController().signal,
      spaceIds: ['default', 'space-a', 'space-b'],
    });

    expect(result).toEqual({
      aborted: false,
      failedSpaceCount: 1,
      snapshots: [snapshotFor('default'), snapshotFor('space-b')],
    });
    expect(logger.debug).toHaveBeenCalled();
  });

  it('stops reading spaces once the run is aborted', async () => {
    const controller = new AbortController();
    const collect = jest.fn(async (spaceId: string) => {
      controller.abort();
      return snapshotFor(spaceId);
    });

    const result = await collectSpaceSnapshots({
      collect,
      concurrency: 1,
      logger: loggerMock.create(),
      signal: controller.signal,
      spaceIds: ['default', 'space-a', 'space-b'],
    });

    expect(collect).toHaveBeenCalledTimes(1);
    expect(result.aborted).toBe(true);
  });
});
