/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentIdCondition, UNASSIGNED_CONDITION } from './assign_by_condition';
import { BROWSER_COST_MIB, LIGHTWEIGHT_COST_MIB } from './assign_shards';
import type { ShardedPackagePolicy } from './rebalance_writes';
import {
  configIdOf,
  toClearedConditionUpdates,
  toConditionUpdates,
  toMonitorPlacements,
} from './rebalance_writes';

const LOCATION = 'loc1';

// Fixtures carry exactly what `listByAgentPolicy` projects, so a field this
// path stops fetching but starts reading fails to compile here.
const policy = (over: Partial<ShardedPackagePolicy> & { id: string }): ShardedPackagePolicy => ({
  name: over.id,
  inputs: [{ type: 'synthetics/http', enabled: true }],
  policy_ids: ['agent-policy-1'],
  spaceIds: ['default'],
  version: 'WzAsMV0=',
  revision: 1,
  ...over,
});

const browserPolicy = (
  over: Partial<ShardedPackagePolicy> & { id: string }
): ShardedPackagePolicy =>
  policy({
    inputs: [
      { type: 'synthetics/http', enabled: false },
      { type: 'synthetics/browser', enabled: true },
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
    expect(updates[0].update.id).toBe(`m1-${LOCATION}`);
    expect(updates[0].update.attributes.condition).toBe(agentIdCondition('agent-b'));
  });

  it('re-sends name so Fleet can still name the write in the audit log', () => {
    const bySpace = toConditionUpdates(
      [
        policy({
          id: `m1-${LOCATION}`,
          name: 'my monitor',
          condition: agentIdCondition('agent-a'),
        }),
      ],
      new Map([['m1', 'agent-b']]),
      LOCATION
    );

    // Saved-object bulkUpdate echoes back only the attributes it was sent, so
    // Fleet's bulkUpdatePartial would otherwise log `name: undefined`.
    expect(bySpace.get('default')![0].update.attributes.name).toBe('my monitor');
  });

  it('sends only the condition, name and revision metadata, not the whole policy', () => {
    const bySpace = toConditionUpdates(
      [policy({ id: `m1-${LOCATION}`, condition: agentIdCondition('agent-a') })],
      new Map([['m1', 'agent-b']]),
      LOCATION
    );

    // Anything not listed here is left to the saved-objects merge, so a stale
    // snapshot cannot revert a concurrent edit to inputs/vars/package. `name`
    // rides along unchanged purely to keep the audit-log entry identifiable.
    expect(Object.keys(bySpace.get('default')![0].update.attributes).sort()).toEqual([
      'condition',
      'name',
      'revision',
      'updated_at',
      'updated_by',
    ]);
  });

  it('bumps revision, since it is compiled into the agent policy document', () => {
    const bySpace = toConditionUpdates(
      [policy({ id: `m1-${LOCATION}`, revision: 7, condition: agentIdCondition('agent-a') })],
      new Map([['m1', 'agent-b']]),
      LOCATION
    );

    expect(bySpace.get('default')![0].update.attributes.revision).toBe(8);
  });

  it('captures the agent policies to bump, which the write result cannot supply', () => {
    const bySpace = toConditionUpdates(
      [
        policy({
          id: `m1-${LOCATION}`,
          policy_ids: ['ap-1', 'ap-2'],
          condition: agentIdCondition('agent-a'),
        }),
      ],
      new Map([['m1', 'agent-b']]),
      LOCATION
    );

    expect(bySpace.get('default')![0].agentPolicyIds).toEqual(['ap-1', 'ap-2']);
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

    expect(bySpace.get('default')![0].update.version).toBe('WzEsMV0=');
  });

  it('skips a policy with no version rather than writing without a concurrency token', () => {
    const bySpace = toConditionUpdates(
      [policy({ id: `m1-${LOCATION}`, version: undefined, condition: agentIdCondition('a') })],
      new Map([['m1', 'agent-b']]),
      LOCATION
    );

    expect(bySpace.size).toBe(0);
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
    expect(bySpace.get('default')!.map(({ update }) => update.id)).toEqual([
      `m1-${LOCATION}`,
      `m1-${LOCATION}-default`,
    ]);
    expect(bySpace.get('default')!.map(({ update }) => update.attributes.condition)).toEqual([
      agentIdCondition('agent-b'),
      agentIdCondition('agent-b'),
    ]);
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

describe('toClearedConditionUpdates', () => {
  it('emits a null-condition update for every policy that currently has a pin', () => {
    const bySpace = toClearedConditionUpdates([
      policy({ id: `m1-${LOCATION}`, condition: agentIdCondition('agent-a') }),
      policy({ id: `m2-${LOCATION}` }),
    ]);

    const updates = bySpace.get('default')!;
    expect(updates).toHaveLength(1);
    expect(updates[0].update.id).toBe(`m1-${LOCATION}`);
    expect(updates[0].update.attributes.condition).toBeNull();
  });

  it('writes nothing when no policy has a condition', () => {
    expect(toClearedConditionUpdates([policy({ id: `m1-${LOCATION}` })]).size).toBe(0);
  });
});
