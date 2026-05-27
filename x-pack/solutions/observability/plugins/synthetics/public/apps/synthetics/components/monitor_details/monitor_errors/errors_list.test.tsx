/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PingState } from '../../../../../../common/runtime_types';
import { computeActiveErrorKeys, getNextUpStateForResolvedError } from './errors_list';

const makePingState = (overrides: {
  configId: string;
  locationId: string;
  timestamp: string;
  startedAt?: string;
}): PingState =>
  ({
    config_id: overrides.configId,
    '@timestamp': overrides.timestamp,
    timestamp: overrides.timestamp,
    observer: { name: overrides.locationId, geo: { name: overrides.locationId } },
    state: {
      id: `state-${overrides.configId}-${overrides.locationId}-${overrides.timestamp}`,
      started_at: overrides.startedAt ?? overrides.timestamp,
      duration_ms: 0,
      ends: null,
      checks: 1,
      up: 0,
      down: 1,
      status: 'down',
      flap_history: [],
    },
    monitor: {
      check_group: 'cg',
      type: 'http',
      id: overrides.configId,
      name: 'm',
      status: 'down',
    },
    error: { message: 'boom' },
    docId: 'd',
  } as unknown as PingState);

describe('getNextUpStateForResolvedError', () => {
  const MONITOR = 'm-123';
  const errorUsEast = makePingState({
    configId: MONITOR,
    locationId: 'us-east',
    timestamp: '2026-05-07T10:05:00.000Z',
  });

  it('does NOT resolve a us-east error using an eu-west up state for the same monitor', () => {
    const upEuWest = makePingState({
      configId: MONITOR,
      locationId: 'eu-west',
      timestamp: '2026-05-07T10:06:00.000Z',
      startedAt: '2026-05-07T10:06:00.000Z',
    });

    const result = getNextUpStateForResolvedError(errorUsEast, [upEuWest], true);

    expect(result).toBeUndefined();
  });

  it('resolves a us-east error only with a us-east up state after the error timestamp', () => {
    const upUsEast = makePingState({
      configId: MONITOR,
      locationId: 'us-east',
      timestamp: '2026-05-07T10:07:00.000Z',
      startedAt: '2026-05-07T10:07:00.000Z',
    });

    const result = getNextUpStateForResolvedError(errorUsEast, [upUsEast], true);

    expect(result).toBe(upUsEast);
  });

  it('does not resolve when scopeByMonitor=false and up state belongs to different location', () => {
    const upEuWest = makePingState({
      configId: MONITOR,
      locationId: 'eu-west',
      timestamp: '2026-05-07T10:06:00.000Z',
      startedAt: '2026-05-07T10:06:00.000Z',
    });

    const result = getNextUpStateForResolvedError(errorUsEast, [upEuWest], false);

    expect(result).toBeUndefined();
  });
});

describe('computeActiveErrorKeys', () => {
  const MONITOR = 'm-123';

  const activeKey = (err: PingState) => `${err.config_id}:${err['@timestamp']}`;

  it('marks the latest error per (monitor, location) as active when no up follows', () => {
    const errUsEastOld = makePingState({
      configId: MONITOR,
      locationId: 'us-east',
      timestamp: '2026-05-07T09:00:00.000Z',
    });
    const errUsEastLatest = makePingState({
      configId: MONITOR,
      locationId: 'us-east',
      timestamp: '2026-05-07T10:00:00.000Z',
    });
    const errEuWestLatest = makePingState({
      configId: MONITOR,
      locationId: 'eu-west',
      timestamp: '2026-05-07T10:05:00.000Z',
    });

    const ids = computeActiveErrorKeys([errUsEastOld, errUsEastLatest, errEuWestLatest], []);

    expect(ids.has(activeKey(errUsEastLatest))).toBe(true);
    expect(ids.has(activeKey(errEuWestLatest))).toBe(true);
    expect(ids.has(activeKey(errUsEastOld))).toBe(false);
    expect(ids.size).toBe(2);
  });

  it('does not mark a (monitor, location) active when a later up exists in that same location', () => {
    const errEuWest = makePingState({
      configId: MONITOR,
      locationId: 'eu-west',
      timestamp: '2026-05-07T10:00:00.000Z',
    });
    const upEuWest = makePingState({
      configId: MONITOR,
      locationId: 'eu-west',
      timestamp: '2026-05-07T10:05:00.000Z',
      startedAt: '2026-05-07T10:05:00.000Z',
    });

    const ids = computeActiveErrorKeys([errEuWest], [upEuWest]);

    expect(ids.size).toBe(0);
  });

  it('keeps a us-east error active even when an up exists for the same monitor in eu-west', () => {
    const errUsEast = makePingState({
      configId: MONITOR,
      locationId: 'us-east',
      timestamp: '2026-05-07T10:00:00.000Z',
    });
    const upEuWest = makePingState({
      configId: MONITOR,
      locationId: 'eu-west',
      timestamp: '2026-05-07T10:05:00.000Z',
      startedAt: '2026-05-07T10:05:00.000Z',
    });

    const ids = computeActiveErrorKeys([errUsEast], [upEuWest]);

    expect(ids.has(activeKey(errUsEast))).toBe(true);
    expect(ids.size).toBe(1);
  });
});
