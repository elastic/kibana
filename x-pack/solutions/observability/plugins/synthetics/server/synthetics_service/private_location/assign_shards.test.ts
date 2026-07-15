/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assignShard, getShardPool, isScalableLocation } from './assign_shards';

describe('assignShard', () => {
  const shards = ['agent-policy-a', 'agent-policy-b', 'agent-policy-c'];

  it('returns undefined when there are no shards', () => {
    expect(assignShard('monitor-1', [])).toBeUndefined();
  });

  it('returns the only shard when there is one', () => {
    expect(assignShard('monitor-1', ['only'])).toBe('only');
  });

  it('always assigns to one of the provided shards', () => {
    for (let i = 0; i < 100; i++) {
      expect(shards).toContain(assignShard(`monitor-${i}`, shards));
    }
  });

  it('is deterministic and order-independent', () => {
    const reversed = [...shards].reverse();
    for (let i = 0; i < 100; i++) {
      const id = `monitor-${i}`;
      expect(assignShard(id, shards)).toBe(assignShard(id, reversed));
    }
  });

  it('distributes monitors across shards (rough balance)', () => {
    const counts: Record<string, number> = {};
    const total = 3000;
    for (let i = 0; i < total; i++) {
      const shard = assignShard(`monitor-${i}`, shards)!;
      counts[shard] = (counts[shard] ?? 0) + 1;
    }
    // Each shard should get a non-trivial share (well within 2x of even split).
    for (const shard of shards) {
      expect(counts[shard]).toBeGreaterThan(total / shards.length / 2);
    }
  });

  it('minimizes churn when a shard is removed (rendezvous property)', () => {
    const before: Record<string, string> = {};
    const ids = Array.from({ length: 1000 }, (_, i) => `monitor-${i}`);
    ids.forEach((id) => (before[id] = assignShard(id, shards)!));

    const remaining = ['agent-policy-a', 'agent-policy-b'];
    let moved = 0;
    let movedFromRemoved = 0;
    ids.forEach((id) => {
      const after = assignShard(id, remaining)!;
      if (after !== before[id]) {
        moved++;
        // Only monitors that had been on the removed shard may move.
        if (before[id] === 'agent-policy-c') movedFromRemoved++;
      }
    });

    // Every move must be a monitor that was on the removed shard.
    expect(moved).toBe(movedFromRemoved);
    // And monitors not on the removed shard never move.
    expect(moved).toBeLessThan(ids.length);
  });
});

describe('getShardPool', () => {
  it('falls back to agentPolicyId when no pool', () => {
    expect(getShardPool({ agentPolicyId: 'single' })).toEqual(['single']);
  });

  it('uses agentPolicyIds when present', () => {
    expect(getShardPool({ agentPolicyId: 'single', agentPolicyIds: ['a', 'b'] })).toEqual([
      'a',
      'b',
    ]);
  });

  it('ignores empty pool and falls back', () => {
    expect(getShardPool({ agentPolicyId: 'single', agentPolicyIds: [] })).toEqual(['single']);
  });
});

describe('isScalableLocation', () => {
  it('is false without a pool or with a single shard', () => {
    expect(isScalableLocation({})).toBe(false);
    expect(isScalableLocation({ agentPolicyIds: ['a'] })).toBe(false);
  });

  it('is true with more than one shard', () => {
    expect(isScalableLocation({ agentPolicyIds: ['a', 'b'] })).toBe(true);
  });
});
