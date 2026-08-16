/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useOutdatedMwAgentLocationIds } from './use_outdated_mw_agent_locations';
import { useAgentStats } from '../../settings/private_locations/hooks/use_agent_stats';
import type { AgentStat, LocationAgentStats } from '../../../../../../common/types';

jest.mock('../../settings/private_locations/hooks/use_agent_stats');

const mockUseAgentStats = useAgentStats as jest.MockedFunction<typeof useAgentStats>;

const mockAgent = (overrides: Partial<AgentStat> = {}): AgentStat => ({
  host: 'host-1',
  lastCheckin: null,
  healthy: true,
  totalMemoryMib: null,
  usedMemoryMib: null,
  usedMemoryPct: null,
  cpuPct: null,
  agentId: 'agent-1',
  agentVersion: '9.3.4',
  agentStatus: 'online',
  policyRevision: 1,
  lastCheckinMessage: null,
  platform: null,
  tags: [],
  ...overrides,
});

const mockLocationStats = (
  locationId: string,
  agents: AgentStat[]
): [string, LocationAgentStats] => [
  locationId,
  {
    locationId,
    locationLabel: locationId,
    agentPolicyId: `policy-${locationId}`,
    agentPolicyName: `Policy ${locationId}`,
    agents,
  },
];

const setByLocation = (entries: Array<[string, LocationAgentStats]>) => {
  mockUseAgentStats.mockReturnValue({ byLocation: new Map(entries), loading: false });
};

describe('useOutdatedMwAgentLocationIds', () => {
  it('returns an empty set when there are no private locations', () => {
    setByLocation([]);

    const { result } = renderHook(() => useOutdatedMwAgentLocationIds());

    expect(result.current.outdatedLocationIds.size).toBe(0);
  });

  it('excludes a location whose agents all support maintenance windows', () => {
    setByLocation([mockLocationStats('loc-1', [mockAgent({ agentVersion: '8.19.0' })])]);

    const { result } = renderHook(() => useOutdatedMwAgentLocationIds());

    expect(result.current.outdatedLocationIds.has('loc-1')).toBe(false);
  });

  it('includes a location with at least one agent older than the MW support threshold', () => {
    setByLocation([
      mockLocationStats('loc-1', [
        mockAgent({ agentId: 'a1', agentVersion: '9.3.4' }),
        mockAgent({ agentId: 'a2', agentVersion: '8.17.2' }),
      ]),
    ]);

    const { result } = renderHook(() => useOutdatedMwAgentLocationIds());

    expect(result.current.outdatedLocationIds.has('loc-1')).toBe(true);
  });

  it('does not flag a location solely because of an unparsable agent version', () => {
    setByLocation([mockLocationStats('loc-1', [mockAgent({ agentVersion: null })])]);

    const { result } = renderHook(() => useOutdatedMwAgentLocationIds());

    expect(result.current.outdatedLocationIds.has('loc-1')).toBe(false);
  });

  it('only flags the affected location out of several', () => {
    setByLocation([
      mockLocationStats('loc-ok', [mockAgent({ agentVersion: '9.3.4' })]),
      mockLocationStats('loc-outdated', [mockAgent({ agentVersion: '8.17.2' })]),
    ]);

    const { result } = renderHook(() => useOutdatedMwAgentLocationIds());

    expect(result.current.outdatedLocationIds.has('loc-ok')).toBe(false);
    expect(result.current.outdatedLocationIds.has('loc-outdated')).toBe(true);
  });
});
