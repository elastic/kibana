/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/**
 * Deterministic monitor→agent assignment for scalable private locations.
 *
 * Uses rendezvous (highest-random-weight) hashing so that when an agent is
 * added or removed only the monitors that map to the changed agent move; every
 * other assignment is stable. This keeps rebalancing churn minimal when agents
 * join or leave a location. The "ids" here are agent host names (see
 * {@link ./assign_by_condition}); the math is agnostic to what they represent.
 */

// sha256 gives strong avalanche (well-distributed weights for rendezvous)
// without bitwise ops; we read 52 bits of the digest to stay within
// safe-integer range.
const weight = (monitorId: string, nodeId: string): number =>
  parseInt(createHash('sha256').update(`${monitorId}:${nodeId}`).digest('hex').slice(0, 13), 16);

/**
 * Returns the node (agent host) that owns the given monitor, or undefined when
 * there are no nodes to assign to.
 */
export const assignShard = (monitorId: string, nodeIds: string[]): string | undefined => {
  if (nodeIds.length === 0) {
    return undefined;
  }
  if (nodeIds.length === 1) {
    return nodeIds[0];
  }

  let best: string | undefined;
  let bestWeight = -1;
  for (const nodeId of nodeIds) {
    const w = weight(monitorId, nodeId);
    // Tie-break on nodeId for stable, order-independent results.
    if (w > bestWeight || (w === bestWeight && best !== undefined && nodeId < best)) {
      bestWeight = w;
      best = nodeId;
    }
  }
  return best;
};

/**
 * Cost-balanced assignment for a whole location: distributes monitors so each
 * node's summed memory cost is roughly equal, assuming equally-sized agents.
 *
 * Why not plain rendezvous? {@link assignShard} balances by *count*, so a node
 * can draw an unlucky cluster of expensive browser monitors (~50× a lightweight
 * check — see the cost model below) and go over memory while its peers idle.
 *
 * Strategy — Longest-Processing-Time (LPT) greedy: place the most expensive
 * monitors first, each onto the node with the lowest *projected relative load*
 * `(load + cost) / capacity`. With equal capacities this is the classic LPT
 * min-load rule (balances absolute cost). LPT bounds the final spread by roughly
 * a single monitor's cost, so browser monitors (the memory that matters) end up
 * evenly spread. Determinism holds because monitors are processed in a stable
 * (cost desc, id asc) order and ties on relative load are broken toward the
 * monitor's rendezvous home (then lowest node id) — so the same input always
 * yields the same map ⇒ zero writes when nothing changed. The rendezvous
 * tie-break also gives light monitors some affinity to their HRW node, keeping
 * incidental churn down.
 *
 * Unlike {@link assignShard} this needs the whole monitor set (a global view),
 * so it is meant for a full-location (re)placement pass, not per-monitor.
 *
 * @param monitors monitor id + memory cost (see {@link getMonitorCostMib})
 * @param nodeIds candidate nodes (agent host names)
 * @param capacities optional node weight; missing/non-positive entries fall
 *   back to 1 (uniform)
 * @returns map of monitor id → assigned node id
 */
/**
 * Per-node capacity weight, defaulting an unknown/non-positive node to the *mean*
 * of the known capacities (not 1). Capacities are host RAM in MiB (thousands), so
 * defaulting a non-reporting agent to 1 would make it ~thousands× "smaller" than
 * its peers and starve it of load. Treating it as an average-sized agent keeps a
 * mixed fleet (some agents report `host.memory`, some don't) balanced; with no
 * capacities at all this is uniform (every node = 1).
 */
const makeCapacityOf = (
  nodeIds: string[],
  capacities?: ReadonlyMap<string, number>
): ((id: string) => number) => {
  const known = nodeIds
    .map((id) => capacities?.get(id))
    .filter((capacity): capacity is number => capacity !== undefined && capacity > 0);
  const fallback = known.length ? known.reduce((sum, c) => sum + c, 0) / known.length : 1;
  return (id: string): number => {
    const capacity = capacities?.get(id);
    return capacity !== undefined && capacity > 0 ? capacity : fallback;
  };
};

export const balanceShardsByCost = (
  monitors: ReadonlyArray<{ id: string; cost: number }>,
  nodeIds: string[],
  capacities?: ReadonlyMap<string, number>
): Map<string, string> => {
  const assignment = new Map<string, string>();
  if (nodeIds.length === 0 || monitors.length === 0) {
    return assignment;
  }
  if (nodeIds.length === 1) {
    for (const monitor of monitors) {
      assignment.set(monitor.id, nodeIds[0]);
    }
    return assignment;
  }

  const load = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const capacityOf = makeCapacityOf(nodeIds, capacities);

  // Heaviest first; stable id tie-break keeps the result deterministic.
  const ordered = [...monitors].sort((a, b) => b.cost - a.cost || (a.id < b.id ? -1 : 1));

  for (const monitor of ordered) {
    const relativeLoad = (id: string) => (load.get(id)! + monitor.cost) / capacityOf(id);
    const minScore = Math.min(...nodeIds.map(relativeLoad));
    // Epsilon guards float rounding so equal-capacity ties stay exact.
    const candidates = nodeIds.filter((id) => relativeLoad(id) <= minScore + 1e-9);
    // Prefer the monitor's rendezvous home among the best nodes, else the lowest
    // node id — both deterministic and independent of input order.
    const home = assignShard(monitor.id, candidates)!;
    assignment.set(monitor.id, home);
    load.set(home, load.get(home)! + monitor.cost);
  }

  return assignment;
};

export interface MonitorPlacement {
  id: string;
  /** Memory cost weight (MiB); see {@link getMonitorCostMib}. */
  cost: number;
  /** Host the monitor is currently pinned to; undefined/stale ⇒ needs placing. */
  currentHost?: string;
}

const EPSILON = 1e-9;

/**
 * Minimal-churn, capacity-aware rebalance of a location's monitors across its
 * currently-healthy agent hosts. This is the single placement authority for the
 * background rebalance task — it replaces the previous split of "rendezvous
 * failover" vs "full cost-balanced recovery", which reshuffled healthy monitors
 * whenever the two strategies disagreed.
 *
 * It preserves locality and only ever moves:
 *   1. **failover** — monitors whose current host is stale/unknown are placed on
 *      a healthy host (LPT greedy by cost, rendezvous tie-break). Mandatory for
 *      correctness (a monitor must never stay pinned to a dead agent).
 *   2. **load-balance / recovery** — the *minimum* set of monitors needed to fill
 *      an under-utilised `recoveryHosts` target, pulled from the most over-loaded
 *      hosts. Never a full redistribution.
 *
 * Every load-balance move must strictly reduce the imbalance objective
 * `Σ (load − fairShare)²`. Moving a monitor of cost `c` from a donor to a
 * recipient changes it by `2c(c − gap)` where `gap` is the donor's surplus minus
 * the recipient's; this is negative only while `c < gap`, so a move happens only
 * when it genuinely improves balance and the objective strictly decreases each
 * time — guaranteeing termination, idempotency (re-running yields no moves) and
 * a natural anti-churn threshold (a monitor won't move unless the imbalance
 * exceeds its own cost).
 *
 * @param recoveryHosts subset of `healthyHosts` eligible to *receive* load-
 *   balancing moves (anti-flap hysteresis — a freshly-recovered host is excluded
 *   until stable). Defaults to all healthy hosts. Failover ignores this: a stale
 *   monitor can be placed on any healthy host.
 * @returns monitor id → assigned host (only moved monitors differ from input)
 */
export const rebalanceByCost = (
  monitors: ReadonlyArray<MonitorPlacement>,
  healthyHosts: string[],
  opts: {
    capacities?: ReadonlyMap<string, number>;
    recoveryHosts?: string[];
  } = {}
): Map<string, string> => {
  const assignment = new Map<string, string>();
  if (healthyHosts.length === 0 || monitors.length === 0) {
    return assignment;
  }

  const { capacities, recoveryHosts } = opts;
  const healthySet = new Set(healthyHosts);
  const capacityOf = makeCapacityOf(healthyHosts, capacities);
  const load = new Map<string, number>(healthyHosts.map((id) => [id, 0]));

  // Phase 1 — retain: a monitor already on a healthy host stays there (locality).
  const unplaced: MonitorPlacement[] = [];
  for (const monitor of monitors) {
    if (monitor.currentHost && healthySet.has(monitor.currentHost)) {
      assignment.set(monitor.id, monitor.currentHost);
      load.set(monitor.currentHost, load.get(monitor.currentHost)! + monitor.cost);
    } else {
      unplaced.push(monitor);
    }
  }

  // Phase 2 — failover: place stale/unassigned monitors heaviest-first onto the
  // host with the lowest projected relative load (LPT), rendezvous tie-break.
  // NOTE: this is not fenced — if a monitor's old host was a false-positive stale
  // (or hasn't polled the revised policy yet) while the new host has started, both
  // run it briefly. That short overlap is accepted (steady state is exactly-once,
  // Heartbeat indexing is idempotent); see the POC design doc's tradeoffs.
  const ordered = [...unplaced].sort((a, b) => b.cost - a.cost || (a.id < b.id ? -1 : 1));
  for (const monitor of ordered) {
    const relativeLoad = (id: string) => (load.get(id)! + monitor.cost) / capacityOf(id);
    const minScore = Math.min(...healthyHosts.map(relativeLoad));
    const candidates = healthyHosts.filter((id) => relativeLoad(id) <= minScore + EPSILON);
    const target = assignShard(monitor.id, candidates)!;
    assignment.set(monitor.id, target);
    load.set(target, load.get(target)! + monitor.cost);
  }

  // Phase 3 — load-balance onto under-utilised recovery hosts, moving the fewest
  // monitors that each strictly reduce Σ (load − fairShare)².
  const recovery = (recoveryHosts ?? healthyHosts).filter((id) => healthySet.has(id));
  if (recovery.length > 0) {
    const totalCost = monitors.reduce((sum, m) => sum + m.cost, 0);
    const totalCapacity = healthyHosts.reduce((sum, id) => sum + capacityOf(id), 0);
    const fairShare = (id: string) => (totalCost * capacityOf(id)) / totalCapacity;

    const monitorsByHost = new Map<string, MonitorPlacement[]>();
    for (const monitor of monitors) {
      const host = assignment.get(monitor.id)!;
      const list = monitorsByHost.get(host) ?? [];
      list.push(monitor);
      monitorsByHost.set(host, list);
    }

    const surplusOf = (id: string) => load.get(id)! - fairShare(id);
    const pick = (ids: string[], better: (a: string, b: string) => boolean): string | undefined =>
      ids.reduce<string | undefined>(
        (best, id) => (best === undefined || better(id, best) ? id : best),
        undefined
      );

    // Bounded by monitor count: each iteration moves one monitor and strictly
    // lowers the objective, so it can't cycle.
    for (let i = 0; i < monitors.length; i++) {
      const recipient = pick(
        recovery,
        (a, b) => surplusOf(a) < surplusOf(b) - EPSILON || (surplusOf(a) <= surplusOf(b) && a < b)
      );
      const donor = pick(
        healthyHosts.filter((id) => id !== recipient && (monitorsByHost.get(id)?.length ?? 0) > 0),
        (a, b) => surplusOf(a) > surplusOf(b) + EPSILON || (surplusOf(a) >= surplusOf(b) && a < b)
      );
      if (recipient === undefined || donor === undefined) {
        break;
      }
      const gap = surplusOf(donor) - surplusOf(recipient);
      if (gap <= EPSILON) {
        break; // balanced — nothing left to improve
      }

      // Δ objective for moving cost c donor→recipient is 2c(c − gap); pick the
      // monitor with the most negative Δ (id tie-break). c ≥ gap never helps.
      let mover: MonitorPlacement | undefined;
      let bestDelta = -EPSILON;
      for (const monitor of monitorsByHost.get(donor)!) {
        const delta = 2 * monitor.cost * (monitor.cost - gap);
        if (
          delta < bestDelta ||
          (mover !== undefined && delta <= bestDelta && monitor.id < mover.id)
        ) {
          bestDelta = delta;
          mover = monitor;
        }
      }
      if (mover === undefined) {
        break; // no single move improves balance
      }

      assignment.set(mover.id, recipient);
      load.set(donor, load.get(donor)! - mover.cost);
      load.set(recipient, load.get(recipient)! + mover.cost);
      monitorsByHost.set(
        donor,
        monitorsByHost.get(donor)!.filter((m) => m.id !== mover!.id)
      );
      monitorsByHost.set(recipient, [...(monitorsByHost.get(recipient) ?? []), mover]);
    }
  }

  return assignment;
};

/**
 * ── Memory cost model for capacity-aware sharding ────────────────────────────
 *
 * Rationale: rendezvous by monitor *count* (see {@link assignShard}) is blind to
 * load, so an agent can go over capacity when it draws too many heavy monitors.
 * A `browser` journey costs far more memory than a lightweight (http/tcp/icmp)
 * check, so we weight monitors by an approximate memory footprint (MiB).
 *
 * Numbers below are benchmarks on Elastic Agent `complete` 9.6 (container RSS,
 * target example.com, 1-min schedule):
 *
 *   monitors on one agent        resident floor    run peak
 *   ─────────────────────────    ──────────────    ─────────────────────────
 *   0 (baseline)                 214 MiB           215 MiB
 *   25 lightweight (http)        358 MiB           360 MiB
 *   50 lightweight               420 MiB           422 MiB
 *   50 lw + 1 browser            624 MiB          1056 MiB
 *   50 lw + 2 browsers           636 MiB           801 MiB
 *   50 lw + 4 browsers           645 MiB          2132 MiB  (~4 Chromium at once)
 *
 * Findings:
 *  - lightweight ≈ 2.5 MiB resident/monitor (25→50 slope), negligible burst/CPU;
 *    plus a one-time ~82 MiB synthetics runtime when the first one is added.
 *  - browser carries a ~200 MiB one-time runtime (first browser); each *extra*
 *    browser adds only ~5–12 MiB resident, BUT every Chromium run bursts
 *    ~350–450 MiB and runs align on schedule boundaries, so N aligned browsers
 *    spike concurrently (4 → ~2.1 GiB). The over-capacity risk is browser
 *    *burst*, not resident count — hence browser ≈ 50× a lightweight monitor.
 *
 * These are conservative floors (example.com is trivial; real multi-step
 * journeys cost more) and are meant to be tunable defaults, not exact figures.
 */
export const LIGHTWEIGHT_COST_MIB = 3;
export const BROWSER_COST_MIB = 150; // ≈ 50× lightweight (amortized runtime + fair share of burst)

/** Approximate per-monitor memory footprint (MiB) used for capacity accounting. */
export const getMonitorCostMib = (monitorType: string): number =>
  monitorType === 'browser' ? BROWSER_COST_MIB : LIGHTWEIGHT_COST_MIB;
