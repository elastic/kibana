/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { agentIdFromCondition } from './assign_by_condition';
import { buildShardSentinelPolicy, SHARD_SENTINEL_CONDITION } from './shard_sentinel';
import { testMonitorPolicy } from './test_policy';

describe('buildShardSentinelPolicy', () => {
  const template = testMonitorPolicy as unknown as NewPackagePolicy;
  const sentinel = buildShardSentinelPolicy(template, 'ap-1');

  it('puts ${agent.id} on the right so Fleet Server does not prune it, and never reads as a pin', () => {
    expect(sentinel).toEqual(
      expect.objectContaining({
        name: 'synthetics-shard-sentinel-ap-1',
        is_managed: true,
        policy_ids: ['ap-1'],
        condition: "'__synthetics_unassigned__' == ${agent.id}",
      })
    );
    expect(agentIdFromCondition(SHARD_SENTINEL_CONDITION)).toBeUndefined();
  });

  it('enables only a disabled HTTP monitor and leaves the template untouched', () => {
    const streams = sentinel.inputs.flatMap(({ streams: s }) => s.filter(({ enabled }) => enabled));
    expect(streams.map(({ data_stream: { dataset } }) => dataset)).toEqual(['http']);
    expect(streams[0].vars?.enabled.value).toBe(false);
    expect(template.condition).toBeUndefined();
  });
});
