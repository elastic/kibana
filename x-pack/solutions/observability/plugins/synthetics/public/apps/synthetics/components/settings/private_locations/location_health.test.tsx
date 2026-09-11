/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { AgentStat, LocationAgentStats } from '../../../../../../common/types';
import { LocationHealth } from './location_health';

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

const stats = (agents: AgentStat[]): LocationAgentStats => ({
  locationId: 'loc-1',
  locationLabel: 'Local',
  agentPolicyId: 'policy-1',
  agentPolicyName: 'Synthetics policy',
  isAgentSharding: false,
  agents,
});

describe('LocationHealth', () => {
  it('renders an empty state when no agents are enrolled', () => {
    const { getByTestId } = render(<LocationHealth stats={stats([])} />);

    expect(getByTestId('syntheticsLocationHealthEmpty')).toHaveTextContent('No agents');
  });

  it('renders a healthy summary when every enrolled agent is online', () => {
    const { getByTestId } = render(
      <LocationHealth stats={stats([agent(), agent({ host: 'b', agentId: 'b' })])} />
    );

    expect(getByTestId('syntheticsLocationHealth')).toHaveTextContent('2/2 healthy');
  });

  it('renders a degraded summary when some enrolled agents are unhealthy', () => {
    const { getByTestId } = render(
      <LocationHealth
        stats={stats([agent(), agent({ host: 'b', agentId: 'b', healthy: false })])}
      />
    );

    expect(getByTestId('syntheticsLocationHealth')).toHaveTextContent('1/2 healthy');
  });

  it('renders an error when the agent stats fetch failed and no cached stats exist', () => {
    const { getByTestId, queryByTestId } = render(<LocationHealth error />);

    expect(getByTestId('syntheticsLocationHealthError')).toHaveTextContent('Unable to load');
    expect(queryByTestId('syntheticsLocationHealthEmpty')).not.toBeInTheDocument();
  });

  it('keeps a cached health summary when a later fetch fails', () => {
    const { getByTestId, queryByTestId } = render(
      <LocationHealth stats={stats([agent()])} error />
    );

    expect(getByTestId('syntheticsLocationHealth')).toHaveTextContent('1/1 healthy');
    expect(queryByTestId('syntheticsLocationHealthError')).not.toBeInTheDocument();
  });
});
