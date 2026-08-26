/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryRecommendedAction } from './recommended_actions';
import { ATTACK_DISCOVERY_ASSET_CRITICALITY_LEVELS } from './recommended_actions';

const targets = {
  hosts: ['host-1'],
  users: [],
  ips: [],
  alert_ids: ['alert-1'],
};

describe('recommended actions', () => {
  it('supports process execution parameters for kill-process actions', () => {
    const action = {
      action_type: 'kill_process',
      execution: 'kibana_api',
      capability_ref: 'endpoint.kill_process',
      title: 'Terminate the malicious process',
      rationale: 'The discovery identifies a concrete malicious process.',
      priority: 'immediate',
      targets,
      execution_params: {
        process_entity_id: 'process-entity-id',
        pid: 1234,
        process_name: 'malware',
      },
    } satisfies AttackDiscoveryRecommendedAction;

    expect(action.execution_params.pid).toBe(1234);
  });

  it('supports only known criticality levels for asset-criticality actions', () => {
    const action = {
      action_type: 'set_asset_criticality',
      execution: 'kibana_api',
      capability_ref: 'asset_criticality.set',
      title: 'Raise host criticality',
      rationale: 'The discovery identifies a high-impact asset.',
      priority: 'hardening',
      targets,
      execution_params: {
        criticality_level: 'high_impact',
      },
    } satisfies AttackDiscoveryRecommendedAction;

    expect(ATTACK_DISCOVERY_ASSET_CRITICALITY_LEVELS).toContain(
      action.execution_params.criticality_level
    );
  });
});
