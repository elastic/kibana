/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-agent health, capacity and (for condition-sharded locations) assignment
 * counts for a private location's agent policy. Returned by the
 * `private_locations/agent_stats` route.
 */
export interface AgentStat {
  /** Agent `host.name` (condition shard key); lowercased for sharded locations. */
  host: string;
  /** Monitors currently pinned to this host via package-policy `condition`. */
  monitors: number;
  lastCheckin: number | null;
  /** Whether Fleet reports the agent as online within the stale window. */
  healthy: boolean;
  /** Whether the host is still an enrolled agent on the location's policy. */
  enrolled: boolean;
  /**
   * Total host RAM (MiB), from agent metadata (`host.memory`) or, as a fallback,
   * `system.memory.total` in `metrics-system.memory-*`. Null when neither source
   * is available (UI shows "N/A").
   */
  totalMemoryMib: number | null;
  /**
   * Used host RAM (MiB) and fraction used (0..1), from `system.memory.actual.used.*`
   * in `metrics-system.memory-*` (System integration only). Null when unavailable.
   */
  usedMemoryMib: number | null;
  usedMemoryPct: number | null;
  /**
   * Normalized host CPU usage (0..1) from `system.cpu.total.norm.pct` in
   * `metrics-system.cpu-*` (System integration only). Null when unavailable.
   */
  cpuPct: number | null;
  /** Fleet agent id — freshest enrolled agent on this host when several share it. */
  agentId: string | null;
  agentVersion: string | null;
  agentStatus: string | null;
  policyRevision: number | null;
  lastCheckinMessage: string | null;
  platform: string | null;
  tags: string[];
}

export interface LocationAgentStats {
  locationId: string;
  locationLabel: string;
  agentPolicyId: string;
  /** Agent policy display name, or the id when the policy can't be resolved. */
  agentPolicyName: string;
  agents: AgentStat[];
  /**
   * Monitors not pinned to a specific enrolled host (UNASSIGNED sentinel
   * condition) — run on no agent until the next rebalance.
   */
  unassignedMonitors: number;
}
