/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { agentIdCondition, UNASSIGNED_CONDITION } from './assign_by_condition';
import { BROWSER_COST_MIB, LIGHTWEIGHT_COST_MIB } from './assign_shards';
import { configIdOf, toConditionUpdates, toMonitorPlacements } from './rebalance_writes';

const LOCATION = 'loc1';

const policy = (over: Partial<PackagePolicy> & { id: string }): PackagePolicy =>
  ({
    name: over.id,
    enabled: true,
    inputs: [{ type: 'synthetics/http', enabled: true, streams: [] }],
    policy_ids: ['agent-policy-1'],
    spaceIds: ['default'],
    ...over,
  } as PackagePolicy);

const browserPolicy = (over: Partial<PackagePolicy> & { id: string }): PackagePolicy =>
  policy({
    inputs: [
      { type: 'synthetics/http', enabled: false, streams: [] },
      { type: 'synthetics/browser', enabled: true, streams: [] },
    ],
    ...over,
  });

describe('configIdOf', () => {
  it('extracts the config id from the new-format package-policy id', () => {
    expect(configIdOf(`monitor-abc-${LOCATION}`, LOCATION)).toBe('monitor-abc');
  });

  it('extracts the config id from the legacy space-suffixed id', () => {
    expect(configIdOf(`monitor-abc-${LOCATION}-default`, LOCATION)).toBe('monitor-abc');
  });

  it('returns undefined for a policy id of another location', () => {
    expect(configIdOf(`monitor-abc-other`, LOCATION)).toBeUndefined();
  });
});

describe('toMonitorPlacements', () => {
  it('reads id, cost (by monitor type) and current agent from the condition', () => {
    const placements = toMonitorPlacements(
      [
        policy({ id: `m1-${LOCATION}`, condition: agentIdCondition('agent-a') }),
        browserPolicy({ id: `m2-${LOCATION}`, condition: agentIdCondition('agent-b') }),
        policy({ id: `m3-${LOCATION}`, condition: UNASSIGNED_CONDITION }),
      ],
      LOCATION
    );

    expect(placements).toEqual([
      { id: 'm1', cost: LIGHTWEIGHT_COST_MIB, currentAgentId: 'agent-a' },
      { id: 'm2', cost: BROWSER_COST_MIB, currentAgentId: 'agent-b' },
      { id: 'm3', cost: LIGHTWEIGHT_COST_MIB, currentAgentId: undefined },
    ]);
  });

  it('dedupes a monitor that has both new-format and legacy package policies', () => {
    const placements = toMonitorPlacements(
      [
        policy({ id: `m1-${LOCATION}`, condition: agentIdCondition('agent-a') }),
        policy({ id: `m1-${LOCATION}-default`, condition: agentIdCondition('agent-a') }),
      ],
      LOCATION
    );

    expect(placements).toHaveLength(1);
    expect(placements[0].id).toBe('m1');
  });

  it('skips package policies that do not belong to the location', () => {
    const placements = toMonitorPlacements([policy({ id: `m1-other` })], LOCATION);
    expect(placements).toEqual([]);
  });
});

describe('toConditionUpdates', () => {
  it('emits a condition-only update for a monitor whose agent changed', () => {
    const bySpace = toConditionUpdates(
      [policy({ id: `m1-${LOCATION}`, condition: agentIdCondition('agent-a') })],
      new Map([['m1', 'agent-b']]),
      LOCATION
    );

    const updates = bySpace.get('default')!;
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      id: `m1-${LOCATION}`,
      condition: agentIdCondition('agent-b'),
    });
  });

  it('carries the version token so Fleet rejects a stale (lost-update) write', () => {
    const bySpace = toConditionUpdates(
      [
        policy({
          id: `m1-${LOCATION}`,
          version: 'WzEsMV0=',
          condition: agentIdCondition('agent-a'),
        }),
      ],
      new Map([['m1', 'agent-b']]),
      LOCATION
    );

    expect(bySpace.get('default')![0].version).toBe('WzEsMV0=');
  });

  it('writes nothing when every monitor is already on its assigned agent (steady state)', () => {
    const bySpace = toConditionUpdates(
      [
        policy({ id: `m1-${LOCATION}`, condition: agentIdCondition('agent-a') }),
        browserPolicy({ id: `m2-${LOCATION}`, condition: agentIdCondition('agent-b') }),
      ],
      new Map([
        ['m1', 'agent-a'],
        ['m2', 'agent-b'],
      ]),
      LOCATION
    );

    expect(bySpace.size).toBe(0);
  });

  it('leaves an unplaceable monitor untouched (no assignment ⇒ no write)', () => {
    const bySpace = toConditionUpdates(
      [policy({ id: `m1-${LOCATION}`, condition: agentIdCondition('agent-a') })],
      new Map(), // rebalanceByCost placed nothing (e.g. no healthy agents)
      LOCATION
    );

    expect(bySpace.size).toBe(0);
  });

  it('rewrites both the new-format and legacy package policies of a moved monitor', () => {
    const bySpace = toConditionUpdates(
      [
        policy({ id: `m1-${LOCATION}`, condition: agentIdCondition('agent-a') }),
        policy({ id: `m1-${LOCATION}-default`, condition: agentIdCondition('agent-a') }),
      ],
      new Map([['m1', 'agent-b']]),
      LOCATION
    );

    expect(bySpace.get('default')).toHaveLength(2);
    expect(bySpace.get('default')![0]).toMatchObject({
      id: `m1-${LOCATION}`,
      condition: agentIdCondition('agent-b'),
    });
    expect(bySpace.get('default')![1]).toMatchObject({
      id: `m1-${LOCATION}-default`,
      condition: agentIdCondition('agent-b'),
    });
  });

  it('groups updates by the package policy own space', () => {
    const bySpace = toConditionUpdates(
      [
        policy({ id: `m1-${LOCATION}`, spaceIds: ['default'], condition: agentIdCondition('a') }),
        policy({ id: `m2-${LOCATION}`, spaceIds: ['team-x'], condition: agentIdCondition('a') }),
      ],
      new Map([
        ['m1', 'b'],
        ['m2', 'b'],
      ]),
      LOCATION
    );

    expect(bySpace.get('default')).toHaveLength(1);
    expect(bySpace.get('team-x')).toHaveLength(1);
  });
});
