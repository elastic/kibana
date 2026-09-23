/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/testing/rtl_helpers';
import type { AgentStat, LocationAgentStats } from '../../../../../../common/types';
import { PolicyName } from './policy_name';

jest.mock('../../../hooks', () => ({
  useFleetPermissions: () => ({ canReadAgentPolicies: true, canReadAgents: true }),
}));

jest.mock('./agent_policy_details_flyout', () => ({
  AgentPolicyDetailsFlyout: () => null,
}));

const agent = (overrides: Partial<AgentStat> = {}): AgentStat => ({
  host: 'agent-a',
  lastCheckin: Date.now(),
  healthy: true,
  totalMemoryMib: 8192,
  usedMemoryMib: 1024,
  usedMemoryPct: 0.12,
  cpuPct: 0.04,
  agentId: 'agent-a-id',
  agentVersion: '9.6.0',
  agentStatus: 'online',
  policyRevision: 1,
  lastCheckinMessage: 'Running',
  platform: 'linux',
  tags: [],
  monitorsAssigned: null,
  ...overrides,
});

const locationStats = (agents: AgentStat[]): LocationAgentStats => ({
  locationId: 'loc-1',
  locationLabel: 'Local',
  agentPolicyId: 'policy-1',
  agentPolicyName: 'Synthetics policy',
  isAgentSharding: true,
  agents,
});

describe('PolicyName', () => {
  const renderPolicyName = (
    props: { isAgentSharding?: boolean; locationStats?: LocationAgentStats } = {}
  ) =>
    render(
      <PolicyName
        agentPolicyId="policy-1"
        locationStats={props.locationStats}
        isAgentSharding={props.isAgentSharding}
      />,
      {
        state: {
          agentPolicies: {
            loading: false,
            error: null,
            data: [
              {
                id: 'policy-1',
                name: 'Synthetics policy',
                agents: 2,
                status: 'active',
              },
            ],
          },
        },
      }
    );

  it('shows the classic enrolled-agent count for a non-scalable location', () => {
    const { getByText, queryByTestId } = renderPolicyName();

    expect(getByText('Synthetics policy')).toBeInTheDocument();
    expect(getByText(/Agents:\s*2/)).toBeInTheDocument();
    expect(queryByTestId('syntheticsScalableLocationBadge')).not.toBeInTheDocument();
  });

  it('shows a Scalable badge with enrolled agent count for a sharded location', () => {
    const { getByTestId, queryByText, getByText } = renderPolicyName({
      isAgentSharding: true,
      locationStats: locationStats([agent(), agent({ host: 'agent-b', agentId: 'agent-b-id' })]),
    });

    expect(getByTestId('syntheticsScalableLocationBadge')).toHaveTextContent('Scalable · 2 agents');
    expect(getByText('Synthetics policy')).toBeInTheDocument();
    expect(queryByText(/Agents:/)).not.toBeInTheDocument();
  });
});
