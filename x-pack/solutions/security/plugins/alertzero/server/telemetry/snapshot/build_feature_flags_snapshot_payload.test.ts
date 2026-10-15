/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFeatureFlagsSnapshotPayload } from './build_feature_flags_snapshot_payload';
import { SNAPSHOT_FLAGS } from './constants';
import type { SpaceSnapshot } from './types';

const space = (flags: Partial<SpaceSnapshot['flags']>): SpaceSnapshot => ({
  flags: {
    'securitySolution.attackDiscoveryWorkflowsEnabled': false,
    'securitySolution:enableAlertZero': false,
    'securitySolution:enableAttackDiscoveryWorkflows': false,
    ...flags,
  },
  workers: [],
});

describe('buildFeatureFlagsSnapshotPayload', () => {
  it('counts the spaces where each allowlisted flag is enabled', () => {
    expect(
      buildFeatureFlagsSnapshotPayload({
        serviceAccountsEnabled: true,
        snapshotDay: '2026-09-28',
        spaces: [
          space({
            'securitySolution.attackDiscoveryWorkflowsEnabled': true,
            'securitySolution:enableAlertZero': true,
          }),
          space({
            'securitySolution.attackDiscoveryWorkflowsEnabled': true,
            'securitySolution:enableAttackDiscoveryWorkflows': true,
          }),
          space({ 'securitySolution.attackDiscoveryWorkflowsEnabled': true }),
        ],
      })
    ).toEqual({
      flags: [
        { enabled_space_count: 1, flag: 'securitySolution:enableAlertZero' },
        { enabled_space_count: 1, flag: 'securitySolution:enableAttackDiscoveryWorkflows' },
        { enabled_space_count: 3, flag: 'securitySolution.attackDiscoveryWorkflowsEnabled' },
      ],
      service_accounts_enabled: true,
      snapshot_day: '2026-09-28',
      space_count: 3,
    });
  });

  it('reports every allowlisted flag, with a zero count when no space enables it', () => {
    const payload = buildFeatureFlagsSnapshotPayload({
      serviceAccountsEnabled: true,
      snapshotDay: '2026-09-28',
      spaces: [space({})],
    });

    expect(payload.flags.map(({ flag }) => flag)).toEqual([...SNAPSHOT_FLAGS]);
    expect(payload.flags.every(({ enabled_space_count: count }) => count === 0)).toBe(true);
  });

  it.each([[true], [false]])('reports service_accounts_enabled as given (%s)', (enabled) => {
    expect(
      buildFeatureFlagsSnapshotPayload({
        serviceAccountsEnabled: enabled,
        snapshotDay: '2026-09-28',
        spaces: [space({})],
      }).service_accounts_enabled
    ).toBe(enabled);
  });
});
