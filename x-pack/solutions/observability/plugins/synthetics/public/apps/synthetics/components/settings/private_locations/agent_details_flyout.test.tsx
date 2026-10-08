/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentDetailsFlyout } from './agent_details_flyout';
import type { AgentStat } from '../../../../../../common/types';

jest.mock('../../../contexts', () => ({
  useSyntheticsSettingsContext: () => ({ basePath: '/s/default' }),
}));

jest.mock('../../../hooks', () => ({
  useFleetPermissions: () => ({ canReadAgents: true, canReadAgentPolicies: true }),
}));

const agent: AgentStat = {
  host: 'host-a',
  lastCheckin: Date.parse('2026-08-01T00:00:00.000Z'),
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
  tags: ['prod'],
  monitorsAssigned: 2,
};

describe('AgentDetailsFlyout', () => {
  it('renders health, capacity and a Fleet deep link', () => {
    render(
      <AgentDetailsFlyout
        agent={agent}
        agentPolicyId="policy-1"
        monitorsRun={2}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('syntheticsAgentDetailsFlyout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'host-a' })).toBeInTheDocument();
    expect(screen.getAllByText('agent-1').length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeInTheDocument();
    const fleetLink = screen.getByTestId('syntheticsAgentFlyoutFleetLink');
    expect(fleetLink).toHaveAttribute('href', '/s/default/app/fleet/agents/agent-1');
  });
});
