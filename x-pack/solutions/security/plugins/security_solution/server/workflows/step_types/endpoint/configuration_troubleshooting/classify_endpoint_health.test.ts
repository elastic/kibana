/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostPolicyResponseActionStatus, HostStatus } from '../../../../../common/endpoint/types';
import {
  classifyEndpointHealth,
  type ClassifyEndpointHealthInput,
} from './classify_endpoint_health';

const NO_UNREAD = { unauthorized: [], unavailable: [] };

type HostInput = ClassifyEndpointHealthInput['host'];
type AgentInput = ClassifyEndpointHealthInput['agent'];
type PolicyResponseInput = ClassifyEndpointHealthInput['policyResponse'];

const buildHost = (host_status: string): HostInput => ({
  agent_id: 'agent-1',
  host_status,
});

const buildAgent = (
  components: Array<{
    status: string;
    units?: Array<{ status: string }>;
  }>
): AgentInput => ({
  id: 'agent-1',
  components: components.map((component, componentIndex) => ({
    id: `component-${componentIndex}`,
    type: 'endpoint',
    status: component.status,
    message: '',
    units: (component.units ?? []).map((unit, unitIndex) => ({
      id: `unit-${unitIndex}`,
      type: 'endpoint',
      status: unit.status,
      message: '',
    })),
  })),
});

const buildPolicyResponse = (
  status: string,
  actions: Array<{ name: string; status: string }> = []
): PolicyResponseInput => ({
  '@timestamp': '2022-04-04T18:38:15.7178887Z',
  agent: { id: 'agent-1', version: '8.0.0' },
  Endpoint: {
    policy: {
      applied: {
        id: 'policy-1',
        name: 'policy-1',
        status,
        version: 1,
        endpoint_policy_version: 1,
        actions: actions.map((action) => ({ ...action, message: '' })),
      },
    },
  },
});

describe('classifyEndpointHealth', () => {
  it('flags an updating host as a non-policy failure', () => {
    const result = classifyEndpointHealth({
      host: buildHost(HostStatus.UPDATING),
      agent: buildAgent([{ status: 'HEALTHY' }]),
      policyResponse: buildPolicyResponse(HostPolicyResponseActionStatus.success),
      unread: NO_UNREAD,
    });

    expect(result.reasons).toContain('host_updating');
    expect(result.state).toBe('non_policy_failure');
  });

  it('flags a transitional Elastic Defend unit as a non-policy failure', () => {
    const result = classifyEndpointHealth({
      host: buildHost(HostStatus.HEALTHY),
      agent: buildAgent([{ status: 'HEALTHY', units: [{ status: 'STARTING' }] }]),
      policyResponse: buildPolicyResponse(HostPolicyResponseActionStatus.success),
      unread: NO_UNREAD,
    });

    expect(result.reasons).toContain('component_transitional');
    expect(result.state).toBe('non_policy_failure');
  });

  it('flags an unsupported action as a policy failure', () => {
    const result = classifyEndpointHealth({
      host: buildHost(HostStatus.HEALTHY),
      agent: buildAgent([{ status: 'HEALTHY' }]),
      policyResponse: buildPolicyResponse(HostPolicyResponseActionStatus.success, [
        { name: 'configure_kernel', status: HostPolicyResponseActionStatus.unsupported },
      ]),
      unread: NO_UNREAD,
    });

    expect(result.reasons).toContain('policy_action_unsupported');
    expect(result.state).toBe('policy_failure');
  });

  it('flags an unsupported overall policy status as a policy failure', () => {
    const result = classifyEndpointHealth({
      host: buildHost(HostStatus.HEALTHY),
      agent: buildAgent([{ status: 'HEALTHY' }]),
      policyResponse: buildPolicyResponse(HostPolicyResponseActionStatus.unsupported),
      unread: NO_UNREAD,
    });

    expect(result.reasons).toContain('policy_response_unsupported');
    expect(result.state).toBe('policy_failure');
  });

  it('flags a null policy response without an endpoint id as undetermined', () => {
    const result = classifyEndpointHealth({
      host: buildHost(HostStatus.HEALTHY),
      agent: null,
      policyResponse: null,
      unread: NO_UNREAD,
    });

    expect(result.reasons).toContain('policy_response_missing');
    expect(result.state).toBe('undetermined');
  });

  it('flags a null agent without an unread marker as undetermined', () => {
    const result = classifyEndpointHealth({
      host: buildHost(HostStatus.HEALTHY),
      agent: null,
      policyResponse: buildPolicyResponse(HostPolicyResponseActionStatus.success),
      unread: NO_UNREAD,
    });

    expect(result.reasons).toEqual(['agent_components_unread']);
    expect(result.state).toBe('undetermined');
  });

  it('reports healthy when no reason fires', () => {
    const result = classifyEndpointHealth({
      host: buildHost(HostStatus.HEALTHY),
      agent: buildAgent([{ status: 'HEALTHY' }]),
      policyResponse: buildPolicyResponse(HostPolicyResponseActionStatus.success),
      unread: NO_UNREAD,
    });

    expect(result.reasons).toEqual([]);
    expect(result.state).toBe('healthy');
  });
});
