/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecommendedResponseAction } from './recommended_actions';
import {
  MANUAL_RESPONSE_ACTION_TYPES,
  RESPONSE_ACTION_CAPABILITIES,
  RESPONSE_ACTION_PRIORITIES,
} from './recommended_actions';

const targets = {
  hosts: ['WKSTN-RECV01'],
  users: [],
  ips: [],
  alert_ids: ['alert-1'],
};

describe('recommended response actions', () => {
  it('pairs each Kibana-executable action with the capability that would carry it out', () => {
    const action = {
      action_type: 'isolate_host',
      execution: 'kibana_api',
      capability_ref: 'endpoint.isolate',
      title: 'Isolate WKSTN-RECV01',
      rationale: 'The payload ran and SMB-pivoted to the domain controller.',
      priority: 'immediate',
      targets,
    } satisfies RecommendedResponseAction;

    expect(RESPONSE_ACTION_CAPABILITIES[action.action_type]).toBe(action.capability_ref);
  });

  it('leaves a manual action without a capability, because nothing could carry it out', () => {
    const action = {
      action_type: 'block_indicator',
      execution: 'manual',
      title: 'Block 185.220.101.42 at the network perimeter',
      rationale: 'Two hosts are beaconing to this address.',
      priority: 'immediate',
      targets: { alert_ids: [], hosts: [], ips: ['185.220.101.42'], users: [] },
    } satisfies RecommendedResponseAction;

    expect(MANUAL_RESPONSE_ACTION_TYPES).toContain(action.action_type);
    expect(action).not.toHaveProperty('capability_ref');
  });

  // The demo's `endpoint_response_actions` skill states its supported scope, and recommending
  // outside it would propose containment the executor refuses by contract.
  it('names no action type the Endpoint response-action scope excludes', () => {
    const unsupported = [
      'execute',
      'get_file',
      'kill_process',
      'memory_dump',
      'runscript',
      'suspend_process',
      'upload',
    ];

    expect(
      unsupported.filter(
        (actionType) =>
          actionType in RESPONSE_ACTION_CAPABILITIES ||
          MANUAL_RESPONSE_ACTION_TYPES.includes(
            actionType as (typeof MANUAL_RESPONSE_ACTION_TYPES)[number]
          )
      )
    ).toEqual([]);
  });

  // Priorities carry the urgency the analysis assigned, which is what orders the list a human
  // reads first.
  it('orders priorities from most to least urgent', () => {
    expect(RESPONSE_ACTION_PRIORITIES).toEqual(['immediate', 'investigation', 'hardening']);
  });
});
