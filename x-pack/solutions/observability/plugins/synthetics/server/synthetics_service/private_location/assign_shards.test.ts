/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assignShard,
  balanceShardsByCost,
  rebalanceByCost,
  getMonitorCostMib,
  BROWSER_COST_MIB,
  LIGHTWEIGHT_COST_MIB,
  type MonitorPlacement,
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

describe('cost model', () => {
  it('prices a browser monitor ~50x a lightweight one', () => {
    expect(getMonitorCostMib('http')).toBe(LIGHTWEIGHT_COST_MIB);
    expect(getMonitorCostMib('browser')).toBe(BROWSER_COST_MIB);
    expect(getMonitorCostMib('browser') / getMonitorCostMib('http')).toBe(50);
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

  it('treats a shard with no reported capacity as average-sized, not starved', () => {
    const monitors = Array.from({ length: 60 }, (_, i) => lightweight(`m${i}`));
    // s1/s2 report RAM in MiB; s3 reports nothing. Defaulting s3 to 1 would make
    // it ~thousands× smaller and give it ~0 load — it should instead get a fair
    // (average-sized) share.
    const capacities = new Map([
      ['s1', 8000],
      ['s2', 8000],
    ]);
    const loads = loadByShard(balanceShardsByCost(monitors, shards, capacities), monitors);
    expect(loads.s3).toBeGreaterThan(0);
    // With s3 defaulted to the mean (8000), all three are equal → ~1/3 each.
    expect(loads.s3 / (loads.s1 + loads.s2 + loads.s3)).toBeGreaterThan(0.25);
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

describe('rebalanceByCost', () => {
  const hosts = ['h1', 'h2', 'h3'];
  const lw = (id: string, currentHost?: string): MonitorPlacement => ({
    id,
    cost: LIGHTWEIGHT_COST_MIB,
    currentHost,
  });
  const br = (id: string, currentHost?: string): MonitorPlacement => ({
    id,
    cost: BROWSER_COST_MIB,
    currentHost,
  });

  const loadByHost = (assignment: Map<string, string>, monitors: MonitorPlacement[]) => {
    const cost = new Map(monitors.map((m) => [m.id, m.cost]));
    const loads: Record<string, number> = {};
    for (const [id, host] of assignment) {
      loads[host] = (loads[host] ?? 0) + cost.get(id)!;
    }
    return loads;
  };
  // Feed an assignment back as the new current state, to test idempotency / churn.
  const applied = (monitors: MonitorPlacement[], assignment: Map<string, string>) =>
    monitors.map((m) => ({ ...m, currentHost: assignment.get(m.id) }));
  const movedCount = (monitors: MonitorPlacement[], assignment: Map<string, string>) =>
    monitors.filter((m) => m.currentHost !== assignment.get(m.id)).length;
  // Round-robin seed = exactly cost-balanced when every monitor has equal cost.
  const balancedLw = (n: number, over: string[]) =>
    Array.from({ length: n }, (_, i) => lw(`m${i}`, over[i % over.length]));

  it('returns empty for no healthy hosts or no monitors', () => {
    expect(rebalanceByCost([lw('m1')], []).size).toBe(0);
    expect(rebalanceByCost([], hosts).size).toBe(0);
  });

  it('places every monitor on a healthy host', () => {
    const monitors = Array.from({ length: 30 }, (_, i) => lw(`m${i}`));
    const assignment = rebalanceByCost(monitors, hosts);
    expect(assignment.size).toBe(monitors.length);
    for (const host of assignment.values()) {
      expect(hosts).toContain(host);
    }
  });

  it('never leaves a monitor pinned to a stale (unhealthy) host', () => {
    const monitors = Array.from({ length: 30 }, (_, i) => lw(`m${i}`, 'dead-agent'));
    const assignment = rebalanceByCost(monitors, hosts);
    for (const host of assignment.values()) {
      expect(hosts).toContain(host);
    }
    expect([...assignment.values()]).not.toContain('dead-agent');
  });

  it('performs zero moves in a balanced steady state and is idempotent', () => {
    const monitors = balancedLw(30, hosts); // 10 per host, exactly fair
    const assignment = rebalanceByCost(monitors, hosts, { recoveryHosts: hosts });
    expect(movedCount(monitors, assignment)).toBe(0);
    // Re-running on its own output moves nothing further.
    const again = rebalanceByCost(applied(monitors, assignment), hosts, { recoveryHosts: hosts });
    expect(movedCount(applied(monitors, assignment), again)).toBe(0);
  });

  it('fails over only the offline host’s monitors, leaving healthy ones in place', () => {
    const monitors = balancedLw(30, hosts); // 10 on each of h1/h2/h3
    const healthy = ['h1', 'h2']; // h3 offline
    const assignment = rebalanceByCost(monitors, healthy, { recoveryHosts: healthy });

    for (const m of monitors) {
      if (m.currentHost === 'h3') {
        expect(healthy).toContain(assignment.get(m.id)); // evacuated to a healthy host
      } else {
        expect(assignment.get(m.id)).toBe(m.currentHost); // locality: untouched
      }
    }
    // Exactly h3's 10 monitors moved.
    expect(movedCount(monitors, assignment)).toBe(10);
  });

  it('does not move work onto a healthy host excluded from recovery (hysteresis)', () => {
    const monitors = balancedLw(20, ['h1', 'h2']); // all on h1/h2; h3 freshly recovered
    const assignment = rebalanceByCost(monitors, hosts, { recoveryHosts: ['h1', 'h2'] });
    expect([...assignment.values()]).not.toContain('h3');
    expect(movedCount(monitors, assignment)).toBe(0);
  });

  it('redistributes minimally onto a recovery-eligible empty host', () => {
    const monitors = balancedLw(20, ['h1', 'h2']); // 10 on h1, 10 on h2, h3 empty
    const assignment = rebalanceByCost(monitors, hosts, { recoveryHosts: hosts });

    const h3Count = [...assignment.values()].filter((h) => h === 'h3').length;
    expect(h3Count).toBeGreaterThanOrEqual(5); // got roughly its fair third (~6.67)
    // Only moves are onto h3 — nothing shuffled between h1 and h2.
    expect(movedCount(monitors, assignment)).toBe(h3Count);
    const loads = hosts.map((h) => loadByHost(assignment, monitors)[h] ?? 0);
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(LIGHTWEIGHT_COST_MIB);
  });

  it('does not churn for a sub-monitor imbalance (cost is the anti-churn threshold)', () => {
    // h1 has one more lightweight than h2 → gap equals one monitor's cost, so no
    // move strictly improves balance.
    const monitors = [lw('a', 'h1'), lw('b', 'h1'), lw('c', 'h2')];
    const assignment = rebalanceByCost(monitors, ['h1', 'h2'], { recoveryHosts: ['h1', 'h2'] });
    expect(movedCount(monitors, assignment)).toBe(0);
  });

  it('balances cost within one browser after a failover (cost-aware, not count-aware)', () => {
    const monitors = [
      ...Array.from({ length: 6 }, (_, i) => br(`b${i}`, hosts[i % 3])),
      ...Array.from({ length: 30 }, (_, i) => lw(`m${i}`, hosts[i % 3])),
    ];
    const healthy = ['h1', 'h2']; // h3 offline
    const assignment = rebalanceByCost(monitors, healthy, { recoveryHosts: healthy });
    const loads = healthy.map((h) => loadByHost(assignment, monitors)[h] ?? 0);
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(BROWSER_COST_MIB);
  });

  it('fills a higher-capacity recovery host proportionally more', () => {
    const monitors = Array.from({ length: 60 }, (_, i) => lw(`m${i}`, 'h1')); // all on h1
    const capacities = new Map([
      ['h1', 1000],
      ['h2', 2000],
    ]);
    const assignment = rebalanceByCost(monitors, ['h1', 'h2'], {
      recoveryHosts: ['h1', 'h2'],
      capacities,
    });
    const loads = loadByHost(assignment, monitors);
    expect(loads.h2).toBeGreaterThan(loads.h1); // 2x capacity ⇒ more load
    expect(loads.h2 / (loads.h1 + loads.h2)).toBeGreaterThan(0.55);
  });

  it('is deterministic and order-independent', () => {
    const monitors = [
      br('b1', 'h1'),
      br('b2', 'h3'),
      ...Array.from({ length: 20 }, (_, i) => lw(`m${i}`, hosts[i % 3])),
    ];
    const healthy = ['h1', 'h2'];
    const a = rebalanceByCost(monitors, healthy, { recoveryHosts: healthy });
    const b = rebalanceByCost([...monitors].reverse(), [...healthy].reverse(), {
      recoveryHosts: [...healthy].reverse(),
    });
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
  });
});
