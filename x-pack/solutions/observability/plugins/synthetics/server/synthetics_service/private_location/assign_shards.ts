/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

// Float-rounding guard shared by every relative-load / surplus comparison below,
// so equal-capacity ties stay exact.
const EPSILON = 1e-9;

/**
 * Deterministic monitor→agent assignment for scalable private locations.
 *
 * Uses rendezvous (highest-random-weight) hashing so that when an agent is
 * added or removed only the monitors that map to the changed agent move; every
 * other assignment is stable. This keeps rebalancing churn minimal when agents
 * join or leave a location. The "ids" here are Fleet agent ids (see
 * {@link ./assign_by_condition}); the math is agnostic to what they represent.
 */

// sha256 gives strong avalanche (well-distributed weights for rendezvous)
// without bitwise ops; we read 52 bits of the digest to stay within
// safe-integer range.
const weight = (monitorId: string, nodeId: string): number =>
  parseInt(createHash('sha256').update(`${monitorId}:${nodeId}`).digest('hex').slice(0, 13), 16);

/**
 * Returns the node (enrolled agent) that owns the given monitor, or undefined
 * when there are no nodes to assign to.
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
 * monitor's rendezvous home (the lowest node id) — so the same input always
 * yields the same map ⇒ zero writes when nothing changed. The rendezvous
 * tie-break also gives light monitors some affinity to their HRW node, keeping
 * incidental churn down.
 *
 * Unlike {@link assignShard} this needs the whole monitor set (a global view),
 * so it is meant for a full-location (re)placement pass, not per-monitor.
 *
 * @param monitors monitor id + memory cost (see {@link getMonitorCostMib})
 * @param nodeIds candidate nodes (Fleet agent ids)
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

/**
 * LPT placement step shared by {@link balanceShardsByCost} and the failover phase
 * of {@link rebalanceByCost}: places each already-ordered (heaviest-first) monitor
 * onto the node with the lowest projected relative load, breaking ties toward the
 * monitor's rendezvous home, else the lowest node id — both deterministic and
 * independent of input order. Mutates `load` and `assignment` in place.
 */
const placeByLpt = (
  orderedMonitors: ReadonlyArray<{ id: string; cost: number }>,
  nodeIds: string[],
  load: Map<string, number>,
  capacityOf: (id: string) => number,
  assignment: Map<string, string>
): void => {
  for (const monitor of orderedMonitors) {
    const relativeLoad = (id: string) => (load.get(id)! + monitor.cost) / capacityOf(id);
    const minScore = Math.min(...nodeIds.map(relativeLoad));
    const candidates = nodeIds.filter((id) => relativeLoad(id) <= minScore + EPSILON);
    const target = assignShard(monitor.id, candidates)!;
    assignment.set(monitor.id, target);
    load.set(target, load.get(target)! + monitor.cost);
  }
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

  placeByLpt(ordered, nodeIds, load, capacityOf, assignment);

  return assignment;
};

export interface MonitorPlacement {
  id: string;
  /** Memory cost weight (MiB); see {@link getMonitorCostMib}. */
  cost: number;
  /** Agent the monitor is currently pinned to; undefined/stale ⇒ needs placing. */
  currentAgentId?: string;
}

/**
 * Minimal-churn, capacity-aware rebalance of a location's monitors across its
 * currently-healthy agents. This is the single placement authority for the
 * background rebalance task — it replaces the previous split of "rendezvous
 * failover" vs "full cost-balanced recovery", which reshuffled healthy monitors
 * whenever the two strategies disagreed.
 *
 * It preserves locality and only ever moves:
 *   1. **failover** — monitors whose current agent is stale/unknown are placed on
 *      a healthy agent (LPT greedy by cost, rendezvous tie-break). Mandatory for
 *      correctness (a monitor must never stay pinned to a dead agent).
 *   2. **load-balance / recovery** — the *minimum* set of monitors needed to fill
 *      an under-utilised `recoveryAgentIds` target, pulled from the most
 *      over-loaded agents. Never a full redistribution.
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
 * @param monitors the location's monitors, with their current agent (if any) and
 *   memory cost (see {@link getMonitorCostMib}).
 * @param healthyAgentIds agents eligible to run monitors (Fleet agent ids).
 * @param opts.capacities optional per-agent weight; missing/non-positive entries
 *   fall back to the mean of the known capacities (see {@link makeCapacityOf}).
 * @param opts.recoveryAgentIds subset of `healthyAgentIds` eligible to *receive*
 *   load-balancing moves (anti-flap hysteresis — a freshly-recovered agent is
 *   excluded until stable). Defaults to all healthy agents. Failover ignores
 *   this: a stale monitor can be placed on any healthy agent.
 * @returns monitor id → assigned agent id (only moved monitors differ from input)
 */
export const rebalanceByCost = (
  monitors: ReadonlyArray<MonitorPlacement>,
  healthyAgentIds: string[],
  opts: {
    capacities?: ReadonlyMap<string, number>;
    recoveryAgentIds?: string[];
  } = {}
): Map<string, string> => {
  const assignment = new Map<string, string>();
  if (healthyAgentIds.length === 0 || monitors.length === 0) {
    return assignment;
  }

  const { capacities, recoveryAgentIds } = opts;
  const healthySet = new Set(healthyAgentIds);
  const capacityOf = makeCapacityOf(healthyAgentIds, capacities);
  const load = new Map<string, number>(healthyAgentIds.map((id) => [id, 0]));

  // Phase 1 — retain: a monitor already on a healthy agent stays there (locality).
  const unplaced: MonitorPlacement[] = [];
  for (const monitor of monitors) {
    if (monitor.currentAgentId && healthySet.has(monitor.currentAgentId)) {
      assignment.set(monitor.id, monitor.currentAgentId);
      load.set(monitor.currentAgentId, load.get(monitor.currentAgentId)! + monitor.cost);
    } else {
      unplaced.push(monitor);
    }
  }

  // Phase 2 — failover: place stale/unassigned monitors heaviest-first onto the
  // agent with the lowest projected relative load (LPT), rendezvous tie-break.
  // NOTE: this is not fenced — if a monitor's old agent was a false-positive stale
  // (or hasn't polled the revised policy yet) while the new agent has started,
  // both run it briefly. That short overlap is accepted (steady state is
  // exactly-once, Heartbeat indexing is idempotent); see the tradeoffs in the
  // POC design (https://github.com/elastic/kibana/pull/278434).
  const ordered = [...unplaced].sort((a, b) => b.cost - a.cost || (a.id < b.id ? -1 : 1));
  placeByLpt(ordered, healthyAgentIds, load, capacityOf, assignment);

  // Phase 3 — load-balance onto under-utilised recovery agents, moving the fewest
  // monitors that each strictly reduce Σ (load − fairShare)².
  const recovery = (recoveryAgentIds ?? healthyAgentIds).filter((id) => healthySet.has(id));
  if (recovery.length > 0) {
    const totalCost = monitors.reduce((sum, m) => sum + m.cost, 0);
    const totalCapacity = healthyAgentIds.reduce((sum, id) => sum + capacityOf(id), 0);
    const fairShare = (id: string) => (totalCost * capacityOf(id)) / totalCapacity;

    const monitorsByAgentId = new Map<string, MonitorPlacement[]>();
    for (const monitor of monitors) {
      const agentId = assignment.get(monitor.id);
      if (!agentId) {
        continue;
      }
      const list = monitorsByAgentId.get(agentId) ?? [];
      list.push(monitor);
      monitorsByAgentId.set(agentId, list);
    }

    const surplusOf = (id: string) => load.get(id)! - fairShare(id);
    const pick = (ids: string[], better: (a: string, b: string) => boolean): string | undefined =>
      ids.reduce<string | undefined>(
        (best, id) => (best === undefined || better(id, best) ? id : best),
        undefined
      );

    // Each iteration performs one move that strictly lowers the objective, so it
    // can never cycle; the monitor-count cap just bounds the work done per pass.
    for (let i = 0; i < monitors.length; i++) {
      // Recipient = the most under-utilised recovery agent. Fixing it loses
      // nothing: Δ = 2c(c − gap) shrinks as the recipient's surplus does, so the
      // lowest-surplus recipient minimises Δ for *every* candidate monitor — if no
      // move helps it, no move helps any other recipient either.
      const recipient = pick(
        recovery,
        (a, b) => surplusOf(a) < surplusOf(b) - EPSILON || (surplusOf(a) <= surplusOf(b) && a < b)
      );
      if (recipient === undefined) {
        break;
      }

      // Δ objective for moving cost c donor→recipient is 2c(c − gap), so c ≥ gap
      // never helps. Scan every donor's monitors and take the most negative Δ,
      // tie-broken on (agent id, monitor id) so the result stays deterministic and
      // independent of input order. Scanning *all* donors matters: the single
      // highest-surplus donor may hold only monitors too heavy to help (e.g. one
      // browser check) while a lighter donor still has a beneficial move — stopping
      // at the first donor would leave the recovery agent starved.
      let best: { donor: string; monitor: MonitorPlacement; delta: number } | undefined;
      for (const donor of healthyAgentIds) {
        if (donor === recipient) {
          continue;
        }
        const gap = surplusOf(donor) - surplusOf(recipient);
        if (gap <= EPSILON) {
          continue; // donor carries no more than its share relative to the recipient
        }
        for (const monitor of monitorsByAgentId.get(donor) ?? []) {
          const delta = 2 * monitor.cost * (monitor.cost - gap);
          if (delta >= -EPSILON) {
            continue; // not a strict improvement (c ≥ gap)
          }
          const breaksTie =
            best !== undefined &&
            delta <= best.delta &&
            (donor < best.donor || (donor === best.donor && monitor.id < best.monitor.id));
          if (best === undefined || delta < best.delta || breaksTie) {
            best = { donor, monitor, delta };
          }
        }
      }
      if (best === undefined) {
        break; // balanced — no single move improves it
      }

      const { donor: moverDonor, monitor: mover } = best;
      assignment.set(mover.id, recipient);
      load.set(moverDonor, load.get(moverDonor)! - mover.cost);
      load.set(recipient, load.get(recipient)! + mover.cost);
      monitorsByAgentId.set(
        moverDonor,
        (monitorsByAgentId.get(moverDonor) ?? []).filter((m) => m.id !== mover.id)
      );
      monitorsByAgentId.set(recipient, [...(monitorsByAgentId.get(recipient) ?? []), mover]);
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
