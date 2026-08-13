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
 * Shard key — we pin on `agent.id`:
 *  - Fleet assigns every enrolled agent a unique top-level id, and Elastic Agent
 *    publishes the same value through the `agent` context provider for condition
 *    evaluation (see elastic-agent
 *    `internal/pkg/composable/providers/agent/agent.go`).
 *  - Unlike `host.name` or `host.id`, it identifies one enrolled agent rather
 *    than a hostname or physical machine. Multiple agents on the same host are
 *    therefore independently assignable and cannot match one another's monitor
 *    conditions.
 *  - A re-enrollment that receives a new `agent.id` is correctly treated as one
 *    agent leaving and another joining; rendezvous placement limits the churn
 *    to monitors owned by the replaced agent.
 *
 * The placement math is plain rendezvous / cost balancing over Fleet agent ids,
 * delegating to {@link assignShard} / {@link balanceShardsByCost}; only the
 * *binding* differs — a `condition` string instead of a moved `policy_id`.
 */

/** A private location is scalable when it opts into condition-based sharding. */
export const isConditionShardedLocation = (location: { isAgentSharding?: boolean }): boolean =>
  Boolean(location.isAgentSharding);

// Elastic Agent EQL single-quoted string literals have NO escape sequences (see
// elastic-agent `internal/pkg/eql/Eql.g4`: `STEXT: '\'' ~[\r\n']* '\''`), so a
// value containing a single quote, backslash or control char cannot be embedded
// safely — it would produce an unparseable condition that breaks policy
// compilation for the whole agent policy. We therefore refuse to use such a
// value as a shard key rather than emit a corrupt condition.
const EQL_UNSAFE_RE = /['\\\n\r\u0000-\u001f]/;

export const isEqlSafeLiteral = (value: string): boolean =>
  value.length > 0 && !EQL_UNSAFE_RE.test(value);

/**
 * Condition that no real agent can satisfy. Stamped on a monitor that has no
 * assignable agent yet so it runs on ZERO agents — preserving at-most-once —
 * instead of running on every agent (which an absent/`null` condition would
 * cause). The next create/edit pass or rebalance replaces it with a real agent
 * condition.
 */
export const UNASSIGNED_CONDITION = "${agent.id} == '__synthetics_unassigned__'";

/** Builds the Elastic Agent condition that targets exactly one enrolled agent. */
export const agentIdCondition = (agentId: string): string => {
  if (!isEqlSafeLiteral(agentId)) {
    throw new Error(`Agent id is not representable in an Elastic Agent condition: "${agentId}"`);
  }
  return `\${agent.id} == '${agentId}'`;
};

const AGENT_ID_CONDITION_RE = /^\$\{agent\.id\}\s*==\s*'([^']*)'$/;

/**
 * Reads the assigned agent id out of a condition previously stamped by
 * {@link agentIdCondition}. Empty, sentinel, or unrecognised conditions are
 * treated as unassigned and picked up by the next rebalance.
 */
export const agentIdFromCondition = (condition?: string | null): string | undefined => {
  if (!condition || condition === UNASSIGNED_CONDITION) {
    return undefined;
  }
  const match = AGENT_ID_CONDITION_RE.exec(condition);
  return match ? match[1] : undefined;
};

/**
 * Rendezvous placement of a monitor onto one of the location's enrolled agents.
 * Returns the assigned agent id and its ready-to-stamp condition, or undefined
 * when the location has no enrolled agents yet.
 */
export const assignAgentById = (
  monitorId: string,
  agentIds: string[]
): { agentId: string; condition: string } | undefined => {
  const agentId = assignShard(monitorId, agentIds);
  return agentId ? { agentId, condition: agentIdCondition(agentId) } : undefined;
};

/** Cost-balanced placement across enrolled agents for a full-location pass. */
export const balanceAgentsByCost = (
  monitors: ReadonlyArray<{ id: string; cost: number }>,
  agentIds: string[],
  capacities?: ReadonlyMap<string, number>
): Map<string, { agentId: string; condition: string }> => {
  const byMonitorId = balanceShardsByCost(monitors, agentIds, capacities);
  const result = new Map<string, { agentId: string; condition: string }>();
  for (const [monitorId, agentId] of byMonitorId) {
    result.set(monitorId, { agentId, condition: agentIdCondition(agentId) });
  }
  return result;
};
