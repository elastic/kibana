/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '@kbn/alertzero-common';
import { buildAutonomySnapshotPayload } from './build_autonomy_snapshot_payload';
import type { SpaceSnapshot } from './types';

const FLAGS_OFF: SpaceSnapshot['flags'] = {
  'securitySolution.attackDiscoveryWorkflowsEnabled': false,
  'securitySolution:enableAlertZero': false,
  'securitySolution:enableAttackDiscoveryWorkflows': false,
};

const space = (workers: SpaceSnapshot['workers']): SpaceSnapshot => ({ flags: FLAGS_OFF, workers });

describe('buildAutonomySnapshotPayload', () => {
  it('counts spaces per worker_id, autonomy_level and enabled, summed across spaces', () => {
    const payload = buildAutonomySnapshotPayload({
      serviceAccountsEnabled: true,
      snapshotDay: '2026-09-28',
      spaces: [
        space([
          {
            autonomyLevel: 'supervised',
            enabled: true,
            workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
          },
          {
            autonomyLevel: 'manual',
            enabled: false,
            workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
          },
        ]),
        space([
          {
            autonomyLevel: 'supervised',
            enabled: true,
            workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
          },
        ]),
        space([
          {
            autonomyLevel: 'supervised',
            enabled: false,
            workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
          },
        ]),
      ],
    });

    expect(payload).toEqual({
      service_accounts_enabled: true,
      snapshot_day: '2026-09-28',
      space_count: 3,
      workers: [
        {
          autonomy_level: 'manual',
          count: 1,
          enabled: false,
          worker_id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
        },
        {
          autonomy_level: 'supervised',
          count: 1,
          enabled: false,
          worker_id: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        },
        {
          autonomy_level: 'supervised',
          count: 2,
          enabled: true,
          worker_id: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        },
      ],
    });
  });

  it('counts every space, including spaces with no installed Worker', () => {
    expect(
      buildAutonomySnapshotPayload({
        serviceAccountsEnabled: true,
        snapshotDay: '2026-09-28',
        spaces: [space([]), space([])],
      })
    ).toEqual({
      service_accounts_enabled: true,
      snapshot_day: '2026-09-28',
      space_count: 2,
      workers: [],
    });
  });

  it('reports service_accounts_enabled false, and no workers field, when service accounts are off', () => {
    const payload = buildAutonomySnapshotPayload({
      serviceAccountsEnabled: false,
      snapshotDay: '2026-09-28',
      spaces: [space([])],
    });

    expect(payload).toEqual({
      service_accounts_enabled: false,
      snapshot_day: '2026-09-28',
      space_count: 1,
    });
    expect(payload).not.toHaveProperty('workers');
  });

  it('ships `other` for a worker id outside the catalog', () => {
    const payload = buildAutonomySnapshotPayload({
      serviceAccountsEnabled: true,
      snapshotDay: '2026-09-28',
      spaces: [space([{ autonomyLevel: 'assisted', enabled: true, workerId: 'custom-worker' }])],
    });

    expect(payload.workers).toEqual([
      { autonomy_level: 'assisted', count: 1, enabled: true, worker_id: 'other' },
    ]);
  });
});
