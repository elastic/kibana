/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { agentIdFromCondition } from './assign_by_condition';
import {
  buildShardSentinelPolicy,
  haveAgentsAppliedSentinel,
  isShardSentinelPolicyId,
  SHARD_SENTINEL_CONDITION,
  shardSentinelPolicyId,
} from './shard_sentinel';
import { testMonitorPolicy } from './test_policy';

describe('shard sentinel', () => {
  it('keeps ${agent.id} on the right so Fleet Server does not prune it for other agents', () => {
    expect(SHARD_SENTINEL_CONDITION).toBe("'__synthetics_unassigned__' == ${agent.id}");
    expect(SHARD_SENTINEL_CONDITION.startsWith('${agent.id}')).toBe(false);
    // Never mistaken for a monitor pin.
    expect(agentIdFromCondition(SHARD_SENTINEL_CONDITION)).toBeUndefined();
  });

  it('derives a stable id per agent policy', () => {
    expect(shardSentinelPolicyId('ap-1')).toBe('synthetics-shard-sentinel-ap-1');
    expect(isShardSentinelPolicyId(shardSentinelPolicyId('ap-1'))).toBe(true);
    expect(isShardSentinelPolicyId('monitor-1-ap-1')).toBe(false);
  });

  describe('buildShardSentinelPolicy', () => {
    const template = testMonitorPolicy as unknown as NewPackagePolicy;
    const sentinel = buildShardSentinelPolicy(template, 'ap-1');

    it('is a managed package policy on the agent policy behind the never-matching condition', () => {
      expect(sentinel).toEqual(
        expect.objectContaining({
          name: 'synthetics-shard-sentinel-ap-1',
          is_managed: true,
          policy_id: 'ap-1',
          policy_ids: ['ap-1'],
          condition: SHARD_SENTINEL_CONDITION,
        })
      );
    });

    it('enables only the HTTP stream, with the monitor itself disabled', () => {
      const enabledInputs = sentinel.inputs.filter(({ enabled }) => enabled);
      expect(enabledInputs.map(({ type }) => type)).toEqual(['synthetics/http']);

      const enabledStreams = sentinel.inputs.flatMap(({ streams }) =>
        streams.filter(({ enabled }) => enabled)
      );
      expect(enabledStreams.map(({ data_stream: { dataset } }) => dataset)).toEqual(['http']);
      expect(enabledStreams[0].vars?.enabled.value).toBe(false);
      expect(enabledStreams[0].vars?.urls.value).toBe('"http://localhost"');
    });

    it('does not modify the template', () => {
      expect(template.condition).toBeUndefined();
      expect(template.inputs.find(({ type }) => type === 'synthetics/http')?.enabled).toBe(false);
    });
  });

  describe('haveAgentsAppliedSentinel', () => {
    it('requires every agent to be at or past the sentinel revision', () => {
      expect(haveAgentsAppliedSentinel([5, 6], 5)).toBe(true);
      expect(haveAgentsAppliedSentinel([5, 4], 5)).toBe(false);
    });

    it('treats an agent without an acknowledged policy as not applied', () => {
      expect(haveAgentsAppliedSentinel([5, null], 5)).toBe(false);
      expect(haveAgentsAppliedSentinel([undefined], 5)).toBe(false);
    });
  });
});
