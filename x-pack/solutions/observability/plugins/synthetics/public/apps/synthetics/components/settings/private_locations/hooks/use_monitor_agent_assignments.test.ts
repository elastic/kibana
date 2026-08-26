/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { fetchMonitorAgentAssignments } from '../../../../state/agent_stats/api';
import { useMonitorAgentAssignments } from './use_monitor_agent_assignments';
import type { MonitorLocationAssignment } from '../../../../../../../common/types';

jest.mock('../../../../state/agent_stats/api');
jest.mock('../../../../contexts', () => ({
  useSyntheticsRefreshContext: () => ({ lastRefresh: 0 }),
}));

const mockFetch = fetchMonitorAgentAssignments as jest.MockedFunction<
  typeof fetchMonitorAgentAssignments
>;

const assignment = (agentId: string): MonitorLocationAssignment => ({
  locationId: 'loc-1',
  locationLabel: 'Location 1',
  isAgentSharding: true,
  agentPolicyId: 'policy-1',
  agentPolicyName: 'Policy One',
  agents: [{ agentId, host: agentId, healthy: true, agentVersion: '9.6.0', enrolled: true }],
});

describe('useMonitorAgentAssignments', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('clears previous assignments when the monitor id changes', async () => {
    mockFetch
      .mockResolvedValueOnce([assignment('agent-a')])
      .mockImplementation(() => new Promise(() => undefined));

    const { result, rerender } = renderHook(
      ({ monitorId }: { monitorId?: string }) => useMonitorAgentAssignments(monitorId),
      { initialProps: { monitorId: 'mon-a' } }
    );

    await waitFor(() => {
      expect(result.current.assignments[0]?.agents[0]?.agentId).toBe('agent-a');
    });

    rerender({ monitorId: 'mon-b' });

    expect(result.current.loading).toBe(true);
    expect(result.current.assignments).toEqual([]);
  });
});
