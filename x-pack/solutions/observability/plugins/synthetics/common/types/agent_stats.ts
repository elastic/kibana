/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-agent health and host capacity for a private location's agent policy,
 * returned by the `private_locations/agent_stats` route and consumed by the
 * private locations table and the monitor "Location agents" section.
 */
export interface AgentStat {
  /** Agent `host.name` in original case (empty when the agent reports none). */
  host: string;
  lastCheckin: number | null;
  /** Whether Fleet reports the agent as online. */
  healthy: boolean;
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
  /** Fleet agent id — unique row key for this stats payload. */
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
}
