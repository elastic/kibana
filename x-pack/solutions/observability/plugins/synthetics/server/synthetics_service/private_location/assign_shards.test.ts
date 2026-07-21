/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assignShard,
  assignWeightedShard,
  balanceShardsByCost,
  getMonitorCostMib,
  getShardPool,
  isScalableLocation,
  shardCapacityMib,
  BROWSER_COST_MIB,
  LIGHTWEIGHT_COST_MIB,
} from './assign_shards';

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

describe('assignWeightedShard', () => {
  const equal = [
    { id: 'a', capacity: 1000 },
    { id: 'b', capacity: 1000 },
    { id: 'c', capacity: 1000 },
  ];

  it('returns undefined / the only shard for degenerate pools', () => {
    expect(assignWeightedShard('m-1', [])).toBeUndefined();
    expect(assignWeightedShard('m-1', [{ id: 'only', capacity: 500 }])).toBe('only');
  });

  it('always assigns to one of the provided shards', () => {
    for (let i = 0; i < 100; i++) {
      expect(equal.map((s) => s.id)).toContain(assignWeightedShard(`monitor-${i}`, equal));
    }
  });

  it('is deterministic and order-independent', () => {
    const reversed = [...equal].reverse();
    for (let i = 0; i < 100; i++) {
      const id = `monitor-${i}`;
      expect(assignWeightedShard(id, equal)).toBe(assignWeightedShard(id, reversed));
    }
  });

  it('gives a higher-capacity shard proportionally more monitors', () => {
    const shards = [
      { id: 'small', capacity: 1000 },
      { id: 'big', capacity: 4000 },
    ];
    const counts: Record<string, number> = { small: 0, big: 0 };
    const total = 5000;
    for (let i = 0; i < total; i++) {
      counts[assignWeightedShard(`monitor-${i}`, shards)!]++;
    }
    // ~4:1 in expectation; assert a comfortably loose band around it.
    const ratio = counts.big / counts.small;
    expect(ratio).toBeGreaterThan(2.5);
    expect(ratio).toBeLessThan(6);
  });

  it('minimizes churn when a shard is removed (rendezvous property)', () => {
    const ids = Array.from({ length: 1000 }, (_, i) => `monitor-${i}`);
    const before = new Map(ids.map((id) => [id, assignWeightedShard(id, equal)!]));
    const remaining = equal.filter((s) => s.id !== 'c');

    ids.forEach((id) => {
      const after = assignWeightedShard(id, remaining)!;
      if (after !== before.get(id)) {
        // Only monitors previously on the removed shard may move.
        expect(before.get(id)).toBe('c');
      }
    });
  });
});

describe('cost model', () => {
  it('prices a browser monitor ~50x a lightweight one', () => {
    expect(getMonitorCostMib('http')).toBe(LIGHTWEIGHT_COST_MIB);
    expect(getMonitorCostMib('browser')).toBe(BROWSER_COST_MIB);
    expect(getMonitorCostMib('browser') / getMonitorCostMib('http')).toBe(50);
  });

  it('reserves browser runtime headroom in shard capacity', () => {
    const ram = 2048;
    expect(shardCapacityMib(ram, false)).toBeGreaterThan(shardCapacityMib(ram, true));
  });

  it('never reports a non-positive capacity', () => {
    expect(shardCapacityMib(100, true)).toBe(1);
  });
});

describe('balanceShardsByCost', () => {
  const shards = ['s1', 's2', 's3'];
  const lightweight = (id: string) => ({ id, cost: LIGHTWEIGHT_COST_MIB });
  const browser = (id: string) => ({ id, cost: BROWSER_COST_MIB });

  const loadByShard = (
    assignment: Map<string, string>,
    monitors: Array<{ id: string; cost: number }>
  ) => {
    const cost = new Map(monitors.map((m) => [m.id, m.cost]));
    const loads: Record<string, number> = {};
    for (const [monitorId, shardId] of assignment) {
      loads[shardId] = (loads[shardId] ?? 0) + cost.get(monitorId)!;
    }
    return loads;
  };

  it('returns empty for no shards or no monitors', () => {
    expect(balanceShardsByCost([lightweight('m1')], []).size).toBe(0);
    expect(balanceShardsByCost([], shards).size).toBe(0);
  });

  it('assigns every monitor to one of the shards', () => {
    const monitors = Array.from({ length: 50 }, (_, i) => lightweight(`m${i}`));
    const assignment = balanceShardsByCost(monitors, shards);
    expect(assignment.size).toBe(monitors.length);
    for (const shardId of assignment.values()) {
      expect(shards).toContain(shardId);
    }
  });

  it('is deterministic and order-independent', () => {
    const monitors = [
      browser('b1'),
      browser('b2'),
      browser('b3'),
      ...Array.from({ length: 20 }, (_, i) => lightweight(`m${i}`)),
    ];
    const a = balanceShardsByCost(monitors, shards);
    const b = balanceShardsByCost([...monitors].reverse(), [...shards].reverse());
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
  });

  it('spreads browser monitors evenly (the memory that matters)', () => {
    const monitors = Array.from({ length: 6 }, (_, i) => browser(`b${i}`));
    const assignment = balanceShardsByCost(monitors, shards);
    const perShard = shards.map((s) => [...assignment.values()].filter((v) => v === s).length);
    expect(perShard).toEqual([2, 2, 2]);
  });

  it('balances total cost within one browser when mixing heavy and light monitors', () => {
    const monitors = [
      ...Array.from({ length: 5 }, (_, i) => browser(`b${i}`)),
      ...Array.from({ length: 40 }, (_, i) => lightweight(`m${i}`)),
    ];
    const loads = loadByShard(balanceShardsByCost(monitors, shards), monitors);
    const values = shards.map((s) => loads[s] ?? 0);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(BROWSER_COST_MIB);
  });

  it('keeps a single-shard location on that shard', () => {
    const monitors = [browser('b1'), lightweight('m1')];
    const assignment = balanceShardsByCost(monitors, ['only']);
    expect([...assignment.values()]).toEqual(['only', 'only']);
  });

  it('fills higher-capacity shards proportionally more when capacities differ', () => {
    const monitors = Array.from({ length: 60 }, (_, i) => lightweight(`m${i}`));
    const capacities = new Map([
      ['s1', 1000],
      ['s2', 1000],
      ['s3', 2000],
    ]);
    const loads = loadByShard(balanceShardsByCost(monitors, shards, capacities), monitors);
    // s3 has 2x the capacity of each peer → should carry ~half the total cost.
    expect(loads.s3).toBeGreaterThan(loads.s1);
    expect(loads.s3).toBeGreaterThan(loads.s2);
    expect(loads.s3 / (loads.s1 + loads.s2 + loads.s3)).toBeGreaterThan(0.4);
  });

  it('is idempotent — re-running on the same set yields the same placement', () => {
    const monitors = [
      ...Array.from({ length: 4 }, (_, i) => browser(`b${i}`)),
      ...Array.from({ length: 25 }, (_, i) => lightweight(`m${i}`)),
    ];
    const first = balanceShardsByCost(monitors, shards);
    const second = balanceShardsByCost(monitors, shards);
    expect([...first.entries()].sort()).toEqual([...second.entries()].sort());
  });

  it('never produces a worse cost spread than plain count-based rendezvous', () => {
    const monitors = [
      ...Array.from({ length: 5 }, (_, i) => browser(`b${i}`)),
      ...Array.from({ length: 30 }, (_, i) => lightweight(`m${i}`)),
    ];
    const spread = (assignment: Map<string, string>) => {
      const values = shards.map((s) => loadByShard(assignment, monitors)[s] ?? 0);
      return Math.max(...values) - Math.min(...values);
    };
    const rendezvous = new Map(monitors.map((m) => [m.id, assignShard(m.id, shards)!]));
    expect(spread(balanceShardsByCost(monitors, shards))).toBeLessThanOrEqual(spread(rendezvous));
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
