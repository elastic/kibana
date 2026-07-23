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
 * Shard key — we pin on BOTH `host.name` and `host.id`:
 *  - `host.name` (lowercased) and `host.id` (machine `UniqueID`) are both
 *    published by the agent `host` context provider AND readable by Kibana from
 *    each agent's `local_metadata` in `.fleet-agents` (verified in
 *    elastic-agent `internal/pkg/composable/providers/host/host.go` and
 *    `internal/pkg/agent/application/info/inject_config.go`).
 *  - `host.name` alone is NOT unique (cloned VMs / containers can share a
 *    hostname), so two same-named agents would both match `${host.name} == 'x'`
 *    and double-run the monitor. Adding `and ${host.id} == '<uniqueId>'` narrows
 *    the match to one machine. `host.id` is also a safe (quote-free) identifier.
 *  - `agent.id` is Kibana-visible but regenerated on re-enroll, so an agent
 *    bounce would reshuffle its slice. Rejected. Agent *tags* / `env.*` aren't
 *    both provider-visible and Kibana-readable. Rejected.
 *
 * The placement math is plain rendezvous / cost balancing over host *names*
 * (stable ids), delegating to {@link assignShard} / {@link balanceShardsByCost};
 * only the *binding* differs — a `condition` string instead of a moved
 * `policy_id`, with the assigned host's `host.id` looked up from `idByHost`.
 */

/** A private location is scalable when it opts into condition-based sharding. */
export const isConditionShardedLocation = (location: {
  agentConditionSharding?: boolean;
}): boolean => Boolean(location.agentConditionSharding);

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
 * Condition that no real agent can satisfy (no agent reports this sentinel as
 * its `host.id`). Stamped on a monitor that has no assignable agent yet so it
 * runs on ZERO agents — preserving at-most-once — instead of running on every
 * agent (which an absent/`null` condition would cause). The next create/edit
 * pass or rebalance replaces it with a real host condition.
 */
export const UNASSIGNED_CONDITION = "${host.id} == '__synthetics_unassigned__'";

/**
 * Builds the Elastic Agent condition that targets exactly one agent. Pins on
 * `${host.name}` and, when known, additionally on `${host.id}` so two agents
 * sharing a hostname can't both match. The `host` provider lowercases
 * `host.name`, so callers pass the already-lowercased value. Throws when the
 * host name isn't representable as an EQL literal — callers must have filtered
 * such agents out of the shard set ({@link isEqlSafeLiteral}).
 */
export const hostNameCondition = (hostName: string, hostId?: string): string => {
  if (!isEqlSafeLiteral(hostName)) {
    throw new Error(`Host name is not representable in an Elastic Agent condition: "${hostName}"`);
  }
  const nameClause = `\${host.name} == '${hostName}'`;
  // host.id is a machine UniqueID (quote-free in practice); guard anyway and
  // drop the clause rather than emit a corrupt condition.
  return hostId && isEqlSafeLiteral(hostId)
    ? `${nameClause} and \${host.id} == '${hostId}'`
    : nameClause;
};

// Matches the `${host.name} == '<name>'` clause produced by hostNameCondition.
// Names are guaranteed quote-free (isEqlSafeLiteral), so a simple `'[^']*'`
// literal is sufficient. The optional trailing `and ${host.id} == '…'` is not
// captured — placement keys on host name, so that's all we read back.
const HOST_NAME_CONDITION_RE = /\$\{host\.name\}\s*==\s*'([^']*)'/;

/**
 * Reads the assigned host name out of a condition previously stamped by
 * {@link hostNameCondition}. Returns undefined for an empty/unrecognised
 * condition (e.g. the {@link UNASSIGNED_CONDITION} sentinel, or a monitor that
 * was never assigned an agent yet) — such monitors are treated as unassigned
 * and picked up by the next rebalance.
 */
export const hostFromCondition = (condition?: string | null): string | undefined => {
  if (!condition) {
    return undefined;
  }
  const match = HOST_NAME_CONDITION_RE.exec(condition);
  return match ? match[1] : undefined;
};

/**
 * Rendezvous placement of a monitor onto one of the location's enrolled agent
 * hosts. Returns the assigned host and its ready-to-stamp condition (pinned on
 * host name + `host.id` when `idByHost` has it), or undefined when the location
 * has no enrolled agents yet (caller then stamps {@link UNASSIGNED_CONDITION}).
 */
export const assignAgentByHost = (
  monitorId: string,
  hostNames: string[],
  idByHost?: ReadonlyMap<string, string>
): { host: string; condition: string } | undefined => {
  const host = assignShard(monitorId, hostNames);
  return host ? { host, condition: hostNameCondition(host, idByHost?.get(host)) } : undefined;
};

/**
 * Cost-balanced placement across enrolled agent hosts for a full-location
 * (re)assignment pass — the analogue of {@link balanceShardsByCost}
 * (browser ≈ 50× a lightweight check). Returns monitor id → { host, condition }.
 */
export const balanceAgentsByCost = (
  monitors: ReadonlyArray<{ id: string; cost: number }>,
  hostNames: string[],
  capacities?: ReadonlyMap<string, number>,
  idByHost?: ReadonlyMap<string, string>
): Map<string, { host: string; condition: string }> => {
  const byHost = balanceShardsByCost(monitors, hostNames, capacities);
  const result = new Map<string, { host: string; condition: string }>();
  for (const [monitorId, host] of byHost) {
    result.set(monitorId, { host, condition: hostNameCondition(host, idByHost?.get(host)) });
  }
  return result;
};
