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
 * Elastic Agent stops its `agent` provider while nothing references `${agent.id}`,
 * and pinning running monitors then stops them until the agent restarts
 * (elastic/elastic-agent#17714). One never-matching sentinel package policy per
 * agent policy keeps the provider running. The operands are reversed because
 * Fleet Server prunes `${agent.id} == '<other agent>'` (elastic/fleet-server#7999).
 */
export const SHARD_SENTINEL_CONDITION = `'${UNASSIGNED_AGENT_ID}' == \${agent.id}`;

const SHARD_SENTINEL_ID_PREFIX = 'synthetics-shard-sentinel-';

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

/** A single disabled HTTP monitor behind {@link SHARD_SENTINEL_CONDITION}. */
export const buildShardSentinelPolicy = (
  template: NewPackagePolicy,
  agentPolicyId: string
): NewPackagePolicy => {
  const policy = cloneDeep(template);
  policy.name = shardSentinelPolicyId(agentPolicyId);
  policy.description = 'Keeps agent-assigned Synthetics monitors running. Managed by Synthetics.';
  policy.namespace = undefined;
  policy.is_managed = true;
  policy.policy_id = agentPolicyId;
  policy.policy_ids = [agentPolicyId];
  policy.condition = SHARD_SENTINEL_CONDITION;

  for (const input of policy.inputs) {
    input.enabled = input.type === 'synthetics/http';
    for (const stream of input.streams) {
      stream.enabled = input.enabled && stream.data_stream.dataset === 'http';
      for (const [key, value] of Object.entries(stream.enabled ? SENTINEL_STREAM_VARS : {})) {
        if (stream.vars?.[key]) {
          stream.vars[key].value = value;
        }
      }
    }
  }
  return policy;
};
