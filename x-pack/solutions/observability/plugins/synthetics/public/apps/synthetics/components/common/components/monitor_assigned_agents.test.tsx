/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MonitorAssignedAgents } from './monitor_assigned_agents';
import { useMonitorAgentAssignments } from '../../settings/private_locations/hooks/use_monitor_agent_assignments';
import type { MonitorLocationAssignment } from '../../../../../../common/types';

jest.mock('../../../contexts', () => ({
  useSyntheticsSettingsContext: () => ({ basePath: '' }),
}));

jest.mock('../../../hooks', () => ({
  useFleetPermissions: () => ({ canReadAgents: true, canReadAgentPolicies: true }),
}));

jest.mock('../../settings/private_locations/hooks/use_monitor_agent_assignments', () => ({
  useMonitorAgentAssignments: jest.fn(),
}));

const mockUseAssignments = useMonitorAgentAssignments as jest.MockedFunction<
  typeof useMonitorAgentAssignments
>;

const assignment = (
  overrides: Partial<MonitorLocationAssignment> = {}
): MonitorLocationAssignment => ({
  locationId: 'loc-1',
  locationLabel: 'Local Docker PL',
  isAgentSharding: false,
  agentPolicyId: 'policy-1',
  agentPolicyName: 'Policy One',
  agents: [
    { agentId: 'agent-1', host: 'host-a', healthy: true, agentVersion: '9.6.0', enrolled: true },
    { agentId: 'agent-2', host: 'host-b', healthy: false, agentVersion: '9.5.0', enrolled: true },
  ],
  ...overrides,
});

describe('MonitorAssignedAgents', () => {
  beforeEach(() => {
    mockUseAssignments.mockReturnValue({ assignments: [], loading: false, error: false });
  });

  it('renders nothing when the monitor has no private-location assignments', () => {
    const { container } = render(
      <MonitorAssignedAgents
        configId="mon-1"
        monitorLocations={[{ id: 'us-east', label: 'US East', isServiceManaged: true }]}
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(mockUseAssignments).toHaveBeenCalledWith(undefined);
  });

  it('keeps the block visible while assignments are loading', () => {
    mockUseAssignments.mockReturnValue({
      assignments: [],
      loading: true,
      error: false,
    });

    render(
      <MonitorAssignedAgents
        configId="mon-1"
        monitorLocations={[
          {
            id: 'loc-1',
            label: 'Local Docker PL',
            isServiceManaged: false,
            agentPolicyId: 'policy-1',
            isAgentSharding: true,
          },
        ]}
      />
    );

    expect(screen.getByText('Assigned agent')).toBeInTheDocument();
    expect(screen.getByTestId('monitorAssignedAgentsLoading')).toBeInTheDocument();
  });

  it('shows an error when assignment fetch failed', () => {
    mockUseAssignments.mockReturnValue({
      assignments: [],
      loading: false,
      error: true,
    });

    render(
      <MonitorAssignedAgents
        configId="mon-1"
        monitorLocations={[{ id: 'loc-1', label: 'Local Docker PL', isServiceManaged: false }]}
      />
    );

    expect(screen.getByText('Location agents')).toBeInTheDocument();
    expect(screen.getByTestId('monitorAssignedAgentsError')).toHaveTextContent(
      'Unable to load assigned agents.'
    );
  });

  it('lists every enrolled agent on a classic location', () => {
    mockUseAssignments.mockReturnValue({
      assignments: [assignment()],
      loading: false,
      error: false,
    });

    render(
      <MonitorAssignedAgents
        configId="mon-1"
        monitorLocations={[{ id: 'loc-1', label: 'Local Docker PL', isServiceManaged: false }]}
      />
    );

    expect(screen.getByText('Location agents')).toBeInTheDocument();
    expect(screen.getByText('host-a')).toBeInTheDocument();
    expect(screen.getByText('host-b')).toBeInTheDocument();
    expect(screen.getByText(/Agent policy: Policy One/)).toBeInTheDocument();
  });

  it('lists only the assigned agent on a sharded location', () => {
    mockUseAssignments.mockReturnValue({
      assignments: [
        assignment({
          isAgentSharding: true,
          agents: [
            {
              agentId: 'agent-2',
              host: 'host-b',
              healthy: true,
              agentVersion: '9.5.0',
              enrolled: true,
            },
          ],
        }),
      ],
      loading: false,
      error: false,
    });

    render(
      <MonitorAssignedAgents
        configId="mon-1"
        monitorLocations={[{ id: 'loc-1', label: 'Local Docker PL', isServiceManaged: false }]}
      />
    );

    expect(screen.getByText('Assigned agent')).toBeInTheDocument();
    expect(screen.getByText('host-b')).toBeInTheDocument();
    expect(screen.queryByText('host-a')).not.toBeInTheDocument();
  });

  it('shows an unassigned state when a sharded location has no pinned agent yet', () => {
    mockUseAssignments.mockReturnValue({
      assignments: [assignment({ isAgentSharding: true, agents: [] })],
      loading: false,
      error: false,
    });

    render(
      <MonitorAssignedAgents
        configId="mon-1"
        monitorLocations={[{ id: 'loc-1', label: 'Local Docker PL', isServiceManaged: false }]}
      />
    );

    expect(screen.getByText('Assigned agent')).toBeInTheDocument();
    expect(screen.getByText(/not yet assigned/i)).toBeInTheDocument();
  });

  it('shows a missing-from-fleet warning when the assigned agent is no longer enrolled', () => {
    mockUseAssignments.mockReturnValue({
      assignments: [
        assignment({
          isAgentSharding: true,
          agents: [
            {
              agentId: 'gone-agent',
              host: '',
              healthy: false,
              agentVersion: null,
              enrolled: false,
            },
          ],
        }),
      ],
      loading: false,
      error: false,
    });

    render(
      <MonitorAssignedAgents
        configId="mon-1"
        monitorLocations={[{ id: 'loc-1', label: 'Local Docker PL', isServiceManaged: false }]}
      />
    );

    expect(screen.getByText('gone-agent')).toBeInTheDocument();
    expect(screen.queryByText(/not yet assigned/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('syntheticsAssignedAgentMissingFromFleet')).toBeInTheDocument();
  });
});
