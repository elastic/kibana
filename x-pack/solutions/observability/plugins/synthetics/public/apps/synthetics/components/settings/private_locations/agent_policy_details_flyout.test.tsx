/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentPolicyDetailsFlyout } from './agent_policy_details_flyout';
import type { LocationAgentStats } from '../../../../../../common/types';

jest.mock('../../../contexts', () => ({
  useSyntheticsSettingsContext: () => ({ basePath: '/s/default' }),
}));

jest.mock('../../../hooks', () => ({
  useFleetPermissions: () => ({ canReadAgents: true, canReadAgentPolicies: true }),
}));

jest.mock('react-redux-v7', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      agentPolicies: {
        data: [
          {
            id: 'policy-1',
            name: 'Policy One',
            agents: 1,
            status: 'active',
            namespace: 'default',
            description: 'Synthetics policy',
            spaceIds: ['default'],
          },
        ],
      },
    }),
}));

const locationStats: LocationAgentStats = {
  locationId: 'loc-1',
  locationLabel: 'Local Docker PL',
  agentPolicyId: 'policy-1',
  agentPolicyName: 'Policy One',
  isAgentSharding: false,
  agents: [
    {
      host: 'host-a',
      lastCheckin: Date.now(),
      healthy: true,
      totalMemoryMib: 8192,
      usedMemoryMib: 2048,
      usedMemoryPct: 0.25,
      cpuPct: 0.1,
      agentId: 'agent-1',
      agentVersion: '9.6.0',
      agentStatus: 'online',
      policyRevision: 6,
      lastCheckinMessage: 'Running',
      platform: 'linux',
      tags: [],
      monitorsAssigned: null,
    },
  ],
};

describe('AgentPolicyDetailsFlyout', () => {
  it('renders policy overview and a Fleet deep link', () => {
    render(
      <AgentPolicyDetailsFlyout
        agentPolicyId="policy-1"
        locationStats={locationStats}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('syntheticsAgentPolicyDetailsFlyout')).toBeInTheDocument();
    expect(screen.getByText('Policy One')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsPolicyFlyoutFleetLink')).toHaveAttribute(
      'href',
      '/s/default/app/fleet/policies/policy-1'
    );
  });
});
