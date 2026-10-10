/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SNAPSHOT_INTERVAL_MS,
  diffHealthyAgents,
  getRebalanceReason,
  isSnapshotDue,
  summarizeDistribution,
} from './sharding_telemetry';

describe('diffHealthyAgents', () => {
  const prior = { 'ap:a': 1, 'ap:b': 1, 'other:x': 1 };

  it('reports evicted and recovered agents for the policy only', () => {
    expect(
      diffHealthyAgents({
        priorHealthySince: prior,
        agentPolicyId: 'ap',
        healthyAgentIds: ['a', 'c'],
      })
    ).toEqual({ evicted: 1, recovered: 1 });
  });

  it('reports nothing the first time a policy is seen', () => {
    expect(
      diffHealthyAgents({
        priorHealthySince: {},
        agentPolicyId: 'ap',
        healthyAgentIds: ['a', 'b'],
      })
    ).toEqual({ evicted: 0, recovered: 0 });
  });
});

describe('getRebalanceReason', () => {
  const none = {
    evicted: 0,
    recovered: 0,
    monitorsFailedOver: 0,
    monitorsMoved: 0,
    moveFailures: 0,
  };

  it.each([
    [{}, undefined],
    [{ evicted: 1 }, 'failover'],
    [{ monitorsFailedOver: 2, recovered: 1 }, 'failover'],
    [{ recovered: 1 }, 'recovery'],
    [{ monitorsMoved: 1 }, 'rebalance'],
    [{ moveFailures: 1 }, 'move_failed'],
  ])('%j -> %s', (over, expected) => {
    expect(getRebalanceReason({ ...none, ...over })).toBe(expected);
  });
});

describe('summarizeDistribution', () => {
  it('summarizes an uneven spread', () => {
    expect(summarizeDistribution({ a: 8, b: 2, c: 2 })).toEqual({
      monitorsPerAgentMin: 2,
      monitorsPerAgentMedian: 2,
      monitorsPerAgentMax: 8,
      skewRatio: 2,
    });
  });

  it('averages the two middle values for an even agent count', () => {
    expect(summarizeDistribution({ a: 1, b: 2 }).monitorsPerAgentMedian).toBe(2);
  });

  it('returns zeros with no agents or no monitors', () => {
    expect(summarizeDistribution({}).skewRatio).toBe(0);
    expect(summarizeDistribution({ a: 0, b: 0 }).skewRatio).toBe(0);
  });
});

describe('isSnapshotDue', () => {
  it('is due on first run and once 24h have passed', () => {
    expect(isSnapshotDue(undefined, 1000)).toBe(true);
    expect(isSnapshotDue(1000, 1000 + SNAPSHOT_INTERVAL_MS)).toBe(true);
    expect(isSnapshotDue(1000, 1000 + SNAPSHOT_INTERVAL_MS - 1)).toBe(false);
  });
});
