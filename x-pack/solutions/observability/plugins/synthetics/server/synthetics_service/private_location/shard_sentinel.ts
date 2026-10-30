/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { cloneDeep } from 'lodash';
import { UNASSIGNED_AGENT_ID } from './assign_shards';

/**
 * ── Shard sentinel: keep Elastic Agent's `agent` provider running ────────────
 *
 * Elastic Agent stops its `agent` context provider while no input in its policy
 * references `${agent.id}`. When a later revision adds `${agent.id}` conditions
 * to inputs that are already running (first pinning after an upgrade, a license
 * renewal, or the rebalance kill switch turned back on), the agent evaluates the
 * conditions before `agent.id` is published, removes every pinned component and
 * re-adds it ~500 ms later, and runtime races leave some of them stopped until
 * the agent restarts (elastic/elastic-agent#17714).
 *
 * One never-matching sentinel package policy per private-location agent policy
 * keeps an `${agent.id}` reference in every agent's policy, so the provider is
 * already running before any monitor is pinned. Its operands are reversed on
 * purpose: Fleet Server drops synthetics inputs whose condition reads
 * `${agent.id} == '<other agent>'` (elastic/fleet-server#7999), which would
 * strip the plain form from every agent's policy.
 */
export const SHARD_SENTINEL_ID_PREFIX = 'synthetics-shard-sentinel-';

/** False on every agent, so the sentinel never runs anywhere. */
export const SHARD_SENTINEL_CONDITION = `'${UNASSIGNED_AGENT_ID}' == \${agent.id}`;

export const shardSentinelPolicyId = (agentPolicyId: string): string =>
  `${SHARD_SENTINEL_ID_PREFIX}${agentPolicyId}`;

export const isShardSentinelPolicyId = (packagePolicyId: string): boolean =>
  packagePolicyId.startsWith(SHARD_SENTINEL_ID_PREFIX);

const SENTINEL_STREAM_VARS: Readonly<Record<string, unknown>> = {
  enabled: false,
  name: JSON.stringify('synthetics-shard-sentinel'),
  urls: JSON.stringify('http://localhost'),
  schedule: JSON.stringify('@every 24h'),
};

/**
 * Sentinel package policy built from the synthetics package template: a single
 * disabled HTTP monitor behind {@link SHARD_SENTINEL_CONDITION}. Only the input
 * condition matters; the monitor is disabled as well so it would not run even
 * if the condition ever matched.
 */
export const buildShardSentinelPolicy = (
  template: NewPackagePolicy,
  agentPolicyId: string
): NewPackagePolicy => {
  const policy = cloneDeep(template);
  policy.name = shardSentinelPolicyId(agentPolicyId);
  policy.description =
    'Keeps scalable private location monitors running while they are assigned to agents. Managed by Synthetics.';
  policy.namespace = undefined;
  policy.is_managed = true;
  policy.policy_id = agentPolicyId;
  policy.policy_ids = [agentPolicyId];
  policy.condition = SHARD_SENTINEL_CONDITION;

  for (const input of policy.inputs) {
    const isHttp = input.type === 'synthetics/http';
    input.enabled = isHttp;
    for (const stream of input.streams) {
      stream.enabled = isHttp && stream.data_stream.dataset === 'http';
      if (!stream.enabled) {
        continue;
      }
      for (const [key, value] of Object.entries(SENTINEL_STREAM_VARS)) {
        const streamVar = stream.vars?.[key];
        if (streamVar) {
          streamVar.value = value;
        }
      }
    }
  }
  return policy;
};

/**
 * True once every healthy agent has applied an agent policy revision that
 * contains the sentinel. Agents that never acknowledged a policy count as not
 * applied.
 */
export const haveAgentsAppliedSentinel = (
  agentPolicyRevisions: ReadonlyArray<number | null | undefined>,
  sentinelRevision: number
): boolean =>
  agentPolicyRevisions.every(
    (revision) => typeof revision === 'number' && revision >= sentinelRevision
  );
