/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assignShard, balanceShardsByCost } from './assign_shards';

/**
 * ── Scalable private locations: one agent policy + many agents ────────────────
 *
 * A scalable private location is backed by a *single* Fleet agent policy holding
 * *many* enrolled agents. Every monitor is pinned to that one policy, and each
 * monitor's package policy gets an Elastic Agent `condition` so only the
 * *assigned* agent runs it — giving at-most-once execution (no duplicate runs)
 * without a pool of agent policies (which would sprawl one policy per agent).
 *
 * Why this works with zero Beats/Heartbeat and zero Fleet-core changes
 * (verified against elastic/elastic-agent and elastic/kibana Fleet):
 *  - Elastic Agent evaluates `condition` (EQL) per input/stream at runtime and
 *    removes the unit entirely when it is false — see
 *    `internal/pkg/agent/transpiler/ast.go` (reserved `condition` key) and
 *    `inputs.go` ("after conditions are applied ... the input is removed"). This
 *    is integration-agnostic, so the heartbeat input honours it unmodified.
 *  - Fleet already carries `condition` on package policies (package/input/stream
 *    level) and compiles it into the delivered policy — see
 *    `fleet/common/types/models/package_policy.ts` and
 *    `fleet/server/services/agent_policies/package_policies_to_agent_inputs.ts`
 *    (`combineConditions`). Setting `newPolicy.condition` is all Kibana needs.
 *
 * Choice of shard key — a stable per-agent fact that (a) Elastic Agent exposes
 * to the condition provider and (b) Kibana can read to build the map:
 *  - `host.name`/`host.id` — stable, and Kibana knows it from each agent's
 *    `local_metadata` in `.fleet-agents`. **Chosen** (assumes one agent per
 *    host, which is the private-location norm).
 *  - `agent.id` — Kibana knows it, but it is regenerated on re-enroll, so an
 *    agent bounce would reshuffle its slice. Rejected.
 *  - agent *tags* — operator-friendly, but NOT published by the agent context
 *    provider (`internal/pkg/composable/providers/agent/agent.go` exposes only
 *    id/version/unprivileged), so they can't be referenced in a `condition`.
 *  - `env.*` — stable and provider-visible, but Kibana can't read an agent's
 *    process env to build the assignment. Rejected.
 *
 * The placement math is plain rendezvous / cost balancing: host names are just
 * rendezvous ids, so this delegates to {@link assignShard} /
 * {@link balanceShardsByCost}. Only the *binding* differs — a `condition` string
 * instead of a moved `policy_id`.
 */

/** A private location is scalable when it opts into condition-based sharding. */
export const isConditionShardedLocation = (location: {
  agentConditionSharding?: boolean;
}): boolean => Boolean(location.agentConditionSharding);

/**
 * Builds an Elastic Agent condition that matches exactly one agent by host name.
 * The agent's `host` provider lowercases `host.name`, so callers should pass the
 * value straight from Fleet metadata (already lowercased). Single quotes are
 * escaped to keep the EQL string literal well-formed.
 */
export const hostNameCondition = (hostName: string): string =>
  `\${host.name} == '${hostName.replace(/'/g, "\\'")}'`;

// Matches the host literal produced by hostNameCondition, tolerating surrounding
// whitespace, so we can read back which host a package policy is currently pinned to.
const HOST_CONDITION_RE = /^\s*\$\{host\.name\}\s*==\s*'((?:\\'|[^'])*)'\s*$/;

/**
 * Reads the host name out of a condition previously stamped by
 * {@link hostNameCondition}. Returns undefined for an empty/unrecognised
 * condition (e.g. a monitor that was never assigned an agent yet).
 */
export const hostFromCondition = (condition?: string | null): string | undefined => {
  if (!condition) {
    return undefined;
  }
  const match = HOST_CONDITION_RE.exec(condition);
  return match ? match[1].replace(/\\'/g, "'") : undefined;
};

/**
 * Rendezvous placement of a monitor onto one of the location's enrolled agent
 * hosts. Returns the assigned host and its ready-to-stamp condition, or
 * undefined when the location has no enrolled agents yet (caller then leaves the
 * monitor unconditioned so it behaves like a classic single-policy location
 * until an agent appears / a rebalance runs).
 */
export const assignAgentByHost = (
  monitorId: string,
  hostNames: string[]
): { host: string; condition: string } | undefined => {
  const host = assignShard(monitorId, hostNames);
  return host ? { host, condition: hostNameCondition(host) } : undefined;
};

/**
 * Cost-balanced placement across enrolled agent hosts for a full-location
 * (re)assignment pass — the analogue of {@link balanceShardsByCost}
 * (browser ≈ 50× a lightweight check). Returns monitor id → { host, condition }.
 */
export const balanceAgentsByCost = (
  monitors: ReadonlyArray<{ id: string; cost: number }>,
  hostNames: string[],
  capacities?: ReadonlyMap<string, number>
): Map<string, { host: string; condition: string }> => {
  const byHost = balanceShardsByCost(monitors, hostNames, capacities);
  const result = new Map<string, { host: string; condition: string }>();
  for (const [monitorId, host] of byHost) {
    result.set(monitorId, { host, condition: hostNameCondition(host) });
  }
  return result;
};
