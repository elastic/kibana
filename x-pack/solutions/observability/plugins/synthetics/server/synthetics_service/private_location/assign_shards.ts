/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/**
 * Deterministic monitor→shard assignment for scalable private locations.
 *
 * Uses rendezvous (highest-random-weight) hashing so that when a shard is
 * added or removed only the monitors that map to the changed shard move; every
 * other assignment is stable. This keeps rebalancing churn minimal when agents
 * join or leave the pool.
 */

// sha256 gives strong avalanche (well-distributed weights for rendezvous)
// without bitwise ops; we read 52 bits of the digest to stay within
// safe-integer range.
const weight = (monitorId: string, shardId: string): number =>
  parseInt(createHash('sha256').update(`${monitorId}:${shardId}`).digest('hex').slice(0, 13), 16);

// weight() reads 13 hex digits, so its output lies in [0, 16^13) = [0, 2^52).
const WEIGHT_MAX = 16 ** 13;

/**
 * Returns the shard (agent policy id) that owns the given monitor, or undefined
 * when there are no shards to assign to.
 */
export const assignShard = (monitorId: string, shardIds: string[]): string | undefined => {
  if (shardIds.length === 0) {
    return undefined;
  }
  if (shardIds.length === 1) {
    return shardIds[0];
  }

  let best: string | undefined;
  let bestWeight = -1;
  for (const shardId of shardIds) {
    const w = weight(monitorId, shardId);
    // Tie-break on shardId for stable, order-independent results.
    if (w > bestWeight || (w === bestWeight && best !== undefined && shardId < best)) {
      bestWeight = w;
      best = shardId;
    }
  }
  return best;
};

/**
 * Capacity-weighted rendezvous assignment.
 *
 * Biases a monitor toward higher-capacity shards using the logarithmic method
 * (Schindelhauer & Schomaker, "Weighted distributed hash tables", 2005):
 *
 *   score(shard) = capacity(shard) / -ln(hash01),   hash01 ∈ (0, 1)
 *
 * and picks the highest score. With equal capacities this degenerates to plain
 * HRW, so it keeps {@link assignShard}'s properties: deterministic,
 * order-independent, at-most-once, and minimal churn when a shard joins/leaves
 * (a monitor only moves if the relative scores across the *changed* shard flip).
 *
 * `capacity` is a unitless weight — pass {@link shardCapacityMib} (agent RAM
 * budget) so a bigger agent proportionally holds more load. It biases placement
 * in expectation; it is NOT a hard cap. Enforce a cap separately if required.
 */
export const assignWeightedShard = (
  monitorId: string,
  shards: ReadonlyArray<{ id: string; capacity: number }>
): string | undefined => {
  if (shards.length === 0) {
    return undefined;
  }
  if (shards.length === 1) {
    return shards[0].id;
  }

  let best: string | undefined;
  let bestScore = -Infinity;
  for (const { id, capacity } of shards) {
    // Map the 52-bit hash into the open interval (0, 1); clamp the endpoints so
    // -ln stays finite (hash01→1 ⇒ score→∞, hash01→0 ⇒ score→0).
    const raw = weight(monitorId, id) / WEIGHT_MAX;
    const hash01 = Math.min(Math.max(raw, Number.MIN_VALUE), 0.999999999999);
    const score = (capacity > 0 ? capacity : 1) / -Math.log(hash01);
    // Tie-break on id for stable, order-independent results.
    if (score > bestScore || (score === bestScore && best !== undefined && id < best)) {
      bestScore = score;
      best = id;
    }
  }
  return best;
};

/**
 * Cost-balanced assignment for a whole location: distributes monitors so each
 * shard's summed memory cost is roughly equal, assuming equally-sized agents.
 *
 * Why not plain rendezvous? {@link assignShard} balances by *count*, so a shard
 * can draw an unlucky cluster of expensive browser monitors (~50× a lightweight
 * check — see the cost model below) and go over memory while its peers idle.
 *
 * Strategy — Longest-Processing-Time (LPT) greedy: place the most expensive
 * monitors first, each onto the shard with the lowest *projected relative load*
 * `(load + cost) / capacity`. With equal capacities this is the classic LPT
 * min-load rule (balances absolute cost); with real per-agent RAM capacities
 * (see {@link shardCapacityMib}) it fills bigger agents proportionally more. LPT
 * bounds the final spread by roughly a single monitor's cost, so browser
 * monitors (the memory that matters) end up evenly spread. Determinism holds
 * because monitors are processed in a stable (cost desc, id asc) order and ties
 * on relative load are broken toward the monitor's rendezvous home (then lowest
 * shard id) — so the same input always yields the same map ⇒ zero writes when
 * nothing changed. The rendezvous tie-break also gives light monitors some
 * affinity to their HRW shard, keeping incidental churn down.
 *
 * Unlike {@link assignShard} this needs the whole monitor set (a global view),
 * so it is meant for a full-location (re)placement pass, not per-monitor.
 *
 * @param monitors monitor id + memory cost (see {@link getMonitorCostMib})
 * @param shardIds candidate shards (agent policy ids)
 * @param capacities optional shard weight (e.g. usable MiB from agent RAM);
 *   missing/non-positive entries fall back to 1 (uniform)
 * @returns map of monitor id → assigned shard id
 */
export const balanceShardsByCost = (
  monitors: ReadonlyArray<{ id: string; cost: number }>,
  shardIds: string[],
  capacities?: ReadonlyMap<string, number>
): Map<string, string> => {
  const assignment = new Map<string, string>();
  if (shardIds.length === 0 || monitors.length === 0) {
    return assignment;
  }
  if (shardIds.length === 1) {
    for (const monitor of monitors) {
      assignment.set(monitor.id, shardIds[0]);
    }
    return assignment;
  }

  const load = new Map<string, number>(shardIds.map((id) => [id, 0]));
  const capacityOf = (id: string): number => {
    const capacity = capacities?.get(id);
    return capacity !== undefined && capacity > 0 ? capacity : 1;
  };

  // Heaviest first; stable id tie-break keeps the result deterministic.
  const ordered = [...monitors].sort((a, b) => b.cost - a.cost || (a.id < b.id ? -1 : 1));

  for (const monitor of ordered) {
    const relativeLoad = (id: string) => (load.get(id)! + monitor.cost) / capacityOf(id);
    const minScore = Math.min(...shardIds.map(relativeLoad));
    // Epsilon guards float rounding so equal-capacity ties stay exact.
    const candidates = shardIds.filter((id) => relativeLoad(id) <= minScore + 1e-9);
    // Prefer the monitor's rendezvous home among the best shards, else the lowest
    // shard id — both deterministic and independent of input order.
    const home = assignShard(monitor.id, candidates)!;
    assignment.set(monitor.id, home);
    load.set(home, load.get(home)! + monitor.cost);
  }

  return assignment;
};

/**
 * ── Memory cost model for capacity-aware sharding ────────────────────────────
 *
 * Rationale: rendezvous by monitor *count* (see {@link assignShard}) is blind to
 * load, so an agent can go over capacity when it draws too many heavy monitors.
 * A `browser` journey costs far more memory than a lightweight (http/tcp/icmp)
 * check, so we weight monitors by an approximate memory footprint (MiB) and
 * derive a shard's capacity from its agent's RAM.
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
export const AGENT_OVERHEAD_MIB = 220; // agent + otel collector + monitoring beats
export const BROWSER_RUNTIME_MIB = 200; // node/Playwright runtime, reserved once per shard with any browser monitor
export const LIGHTWEIGHT_COST_MIB = 3;
export const BROWSER_COST_MIB = 150; // ≈ 50× lightweight (amortized runtime + fair share of burst)

/** Approximate per-monitor memory footprint (MiB) used for capacity accounting. */
export const getMonitorCostMib = (monitorType: string): number =>
  monitorType === 'browser' ? BROWSER_COST_MIB : LIGHTWEIGHT_COST_MIB;

/**
 * Usable capacity (weight) of a shard in MiB, derived from its agent's RAM:
 *   usable = agentRamMiB − AGENT_OVERHEAD_MIB − (hasBrowser ? BROWSER_RUNTIME_MIB : 0)
 * Feed this as the `capacity` in {@link assignWeightedShard}. Returns at least 1
 * so a tiny/misreported agent still receives some share rather than none.
 */
export const shardCapacityMib = (agentRamMib: number, hasBrowser: boolean): number =>
  Math.max(1, agentRamMib - AGENT_OVERHEAD_MIB - (hasBrowser ? BROWSER_RUNTIME_MIB : 0));

/**
 * Resolves the shard pool for a private location. A location is "scalable" when
 * it declares more than one agent policy; otherwise it falls back to its single
 * agentPolicyId, preserving classic behaviour.
 */
export const getShardPool = (location: {
  agentPolicyId: string;
  agentPolicyIds?: string[];
}): string[] => {
  const pool = location.agentPolicyIds?.filter(Boolean) ?? [];
  return pool.length > 0 ? pool : [location.agentPolicyId];
};

export const isScalableLocation = (location: { agentPolicyIds?: string[] }): boolean =>
  (location.agentPolicyIds?.filter(Boolean).length ?? 0) > 1;
