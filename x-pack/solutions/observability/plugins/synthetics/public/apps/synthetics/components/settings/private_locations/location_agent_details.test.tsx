/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { LocationAgentDetails } from './location_agent_details';
import type { AgentStat, LocationAgentStats } from '../../../../../../common/types';

jest.mock('../../../contexts', () => ({
  useSyntheticsSettingsContext: () => ({ basePath: '' }),
}));

jest.mock('../../../hooks', () => ({
  useFleetPermissions: () => ({ canReadAgentPolicies: true, canReadAgents: true }),
}));

jest.mock('react-router-dom', () => ({
  useHistory: () => ({ createHref: () => '/monitors' }),
}));

const agent = (overrides: Partial<AgentStat> = {}): AgentStat => ({
  host: 'agent-a',
  monitors: 2,
  lastCheckin: Date.now(),
  healthy: true,
  enrolled: true,
  totalMemoryMib: 11948,
  usedMemoryMib: 3000,
  usedMemoryPct: 0.25,
  cpuPct: 0.04,
  agentId: 'agent-a-id',
  agentVersion: '9.6.0',
  agentStatus: 'online',
  policyRevision: 6,
  lastCheckinMessage: 'Running',
  platform: 'linux',
  tags: [],
  ...overrides,
});

const stats = (agents: AgentStat[], unassignedMonitors = 0): LocationAgentStats => ({
  locationId: 'loc-1',
  locationLabel: 'Local Docker PL',
  agentPolicyId: 'policy-1',
  agentPolicyName: 'synthetics-private-pol',
  agents,
  unassignedMonitors,
});

describe('LocationAgentDetails', () => {
  it('renders the overview stats and a per-agent row for a healthy location', () => {
    render(
      <LocationAgentDetails
        stats={stats([agent(), agent({ host: 'agent-b', agentId: 'agent-b-id', monitors: 1 })])}
        loading={false}
        agentPolicyId="policy-1"
        locationLabel="Local Docker PL"
        locationMonitorCount={3}
      />
    );

    expect(screen.getByTestId('locationAgentDetails')).toBeInTheDocument();
    expect(screen.getByText('agent-a')).toBeInTheDocument();
    expect(screen.getByText('agent-b')).toBeInTheDocument();
    expect(screen.getByText('2/2')).toBeInTheDocument();
    expect(screen.queryByTestId('locationAgentWarnings')).not.toBeInTheDocument();
    expect(screen.getAllByText(/25%/).length).toBeGreaterThan(0);
  });

  it('surfaces a "Needs attention" warning when an agent is stale', () => {
    render(
      <LocationAgentDetails
        stats={stats([
          agent(),
          agent({
            host: 'agent-down',
            agentId: 'agent-down-id',
            healthy: false,
            agentStatus: 'offline',
            monitors: 1,
          }),
        ])}
        loading={false}
        agentPolicyId="policy-1"
        locationLabel="Local Docker PL"
        locationMonitorCount={3}
      />
    );

    const warnings = screen.getByTestId('locationAgentWarnings');
    expect(warnings).toBeInTheDocument();
    expect(within(warnings).getByText(/stale/)).toBeInTheDocument();
  });

  it('shows N/A for host metrics that are not reported', () => {
    render(
      <LocationAgentDetails
        stats={stats([
          agent({
            host: 'agent-no-metrics',
            monitors: 1,
            totalMemoryMib: null,
            usedMemoryMib: null,
            usedMemoryPct: null,
            cpuPct: null,
          }),
        ])}
        loading={false}
        agentPolicyId="policy-1"
        locationLabel="Local Docker PL"
        locationMonitorCount={1}
      />
    );

    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(2);
  });
});
