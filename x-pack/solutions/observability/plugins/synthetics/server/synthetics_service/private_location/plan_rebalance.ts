/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentInfo } from './get_agent_info';

// Agents poll Fleet roughly every 30s. We treat an agent as stale when it hasn't
// checked in within ~3 poll intervals. This time-based signal (a sustained
// absence) is both the failure trigger and the blip tolerance — far tighter than
// Fleet's built-in offline status (~6 min), whose lag would otherwise dominate
// failover time. Kept conservative on purpose: a false eviction of a still-live
// agent risks brief double execution of a monitor.
export const STALE_CHECKIN_MS = 90_000;

// Anti-flap hysteresis: an agent that has just gone unhealthy→healthy must stay
// healthy this long before it becomes eligible to *receive* recovery
// redistribution. Without it, an agent flapping down↔up faster than this window
// would repeatedly pull load onto itself, churning Fleet package policies (and
// re-deploying browser runtimes) on every bounce. Kept a few check-in intervals
// wide so it outlasts transient blips; failover (evicting a *dead* agent's
// monitors) ignores this and stays immediate.
export const RECOVERY_STABILITY_MS = 3 * 60_000;

/**
 * Stable key for an agent's healthy streak in the task state. Scoped by agent
 * policy so streaks never collide across locations when merged into one map.
 */
export const healthySinceKey = (agentPolicyId: string, agentId: string): string =>
  `${agentPolicyId}:${agentId}`;

export interface LocationRebalancePlan {
  /** Agents whose check-in is fresh enough to run monitors (placement targets). */
  healthyAgentIds: string[];
  /**
   * Subset of `healthyAgentIds` eligible to *receive* load-balancing moves — a
   * freshly-recovered agent is excluded until it has been healthy for
   * `RECOVERY_STABILITY_MS`. Failover ignores this (a stale monitor may go to any
   * healthy agent); it only throttles recovery redistribution.
   */
  recoveryAgentIds: string[];
  /**
   * Healthy-streak start times (`${agentPolicyId}:${agentId}` → epoch ms) for
   * this location's healthy agents, to be persisted into the task state. Agents
   * not healthy this run are absent, so their streak restarts next time they
   * recover — this is what breaks a flapping agent's recovery eligibility.
   */
  nextHealthySince: Record<string, number>;
  /** Per-agent capacity weight (host RAM in MiB); agents without it are omitted. */
  capacities: Map<string, number>;
}

/**
 * Pure planning step for one scalable private location: given the location's
 * enrolled agents and the healthy-streak history carried in task state, decide
 * which agents are healthy, which are stable enough to receive recovery load,
 * and their capacity weights. No I/O — all health/hysteresis policy lives here so
 * it can be unit-tested in isolation; the task shell only fetches inputs, calls
 * this, and applies the resulting placement.
 */
export const planLocationRebalance = ({
  agents,
  now,
  priorHealthySince,
  agentPolicyId,
}: {
  agents: ReadonlyMap<string, AgentInfo>;
  now: number;
  priorHealthySince: Readonly<Record<string, number>>;
  agentPolicyId: string;
}): LocationRebalancePlan => {
  const healthyAgentIds: string[] = [];
  const capacities = new Map<string, number>();
  const nextHealthySince: Record<string, number> = {};

  for (const [agentId, info] of agents) {
    if (now - info.lastCheckin > STALE_CHECKIN_MS) {
      continue; // stale check-in — not a valid target; its monitors fail over
    }
    healthyAgentIds.push(agentId);
    if (info.memoryMib != null) {
      capacities.set(agentId, info.memoryMib);
    }
    // Continue an existing streak, or start one now for a fresh recovery.
    const key = healthySinceKey(agentPolicyId, agentId);
    nextHealthySince[key] = priorHealthySince[key] ?? now;
  }

  const recoveryAgentIds = healthyAgentIds.filter(
    (agentId) =>
      now - nextHealthySince[healthySinceKey(agentPolicyId, agentId)] >= RECOVERY_STABILITY_MS
  );

  return { healthyAgentIds, recoveryAgentIds, nextHealthySince, capacities };
};
