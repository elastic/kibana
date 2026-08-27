/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { SecurityPageName } from '../../../common/constants';
import { useNavigateToDetonationAlerts } from './use_navigate_to_detonation_alerts';

const mockDispatch = jest.fn();
const mockNavigateTo = jest.fn();
const mockSetAppFilters = jest.fn();

jest.mock('react-redux-v7', () => ({ useDispatch: () => mockDispatch }));

jest.mock('../../common/lib/kibana', () => ({
  useNavigation: () => ({ navigateTo: mockNavigateTo }),
  useKibana: () => ({
    services: {
      data: {
        query: { filterManager: { setAppFilters: mockSetAppFilters, getFilters: () => [] } },
      },
    },
  }),
}));

/** Pulls the KQL string out of the `setFilterQuery` action the hook dispatched. */
const dispatchedQuery = (): string | undefined => {
  const call = mockDispatch.mock.calls.find(
    ([action]) => action?.payload?.language === 'kuery' && 'query' in (action?.payload ?? {})
  );
  return call?.[0]?.payload?.query;
};

const navigate = (
  pivot: Parameters<ReturnType<typeof useNavigateToDetonationAlerts>['navigateToAlerts']>[0]
) => {
  const { result } = renderHook(() => useNavigateToDetonationAlerts());
  act(() => result.current.navigateToAlerts(pivot));
};

describe('useNavigateToDetonationAlerts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scopes the pivot to a single detonation with the agent id', () => {
    navigate({ agentId: 'agent-1', timestamp: '2026-06-04T10:40:24.965Z' });

    expect(dispatchedQuery()).toBe('agent.id: "agent-1"');
    expect(mockNavigateTo).toHaveBeenCalledWith({ deepLinkId: SecurityPageName.alerts });
  });

  it('ignores the sample hash when an agent id is available', () => {
    // Most alerts a detonation produces carry no file hash, so combining the two would hide them.
    navigate({ agentId: 'agent-1', sampleHash: 'abc123' });

    expect(dispatchedQuery()).toBe('agent.id: "agent-1"');
  });

  it('falls back to the sample hash when there is no agent id', () => {
    navigate({ sampleHash: 'abc123' });

    expect(dispatchedQuery()).toBe('file.hash.sha256: "abc123"');
  });

  it('prefers a single alert over the detonation it belongs to', () => {
    navigate({ alertId: 'alert-1', agentId: 'agent-1', sampleHash: 'abc123' });

    expect(dispatchedQuery()).toBe('kibana.alert.uuid: "alert-1"');
  });

  it('escapes quotes and backslashes so a crafted value cannot break out of the clause', () => {
    navigate({ agentId: 'a"gent\\1' });

    expect(dispatchedQuery()).toBe('agent.id: "a\\"gent\\\\1"');
  });

  it('narrows to a technique without leaving the detonation', () => {
    navigate({ agentId: 'agent-1', techniqueId: 'T1059' });

    expect(dispatchedQuery()).toBe(
      'agent.id: "agent-1" and (threat.technique.id: "T1059" or kibana.alert.rule.threat.technique.id: "T1059")'
    );
  });

  it('matches both threat fields, since either can carry the technique', () => {
    // `threat` comes from the endpoint behavior rule, `kibana.alert.rule.threat` from the
    // detection rule, and a technique shown in the panel may have arrived on either one.
    navigate({ agentId: 'agent-1', techniqueId: 'T1053.005' });

    expect(dispatchedQuery()).toContain('threat.technique.id: "T1053.005"');
    expect(dispatchedQuery()).toContain('kibana.alert.rule.threat.technique.id: "T1053.005"');
  });

  it('escapes the technique so a crafted value cannot break out of the clause', () => {
    navigate({ agentId: 'agent-1', techniqueId: 'T1" or *: *' });

    expect(dispatchedQuery()).toBe(
      'agent.id: "agent-1" and (threat.technique.id: "T1\\" or *: *" or kibana.alert.rule.threat.technique.id: "T1\\" or *: *")'
    );
  });

  it('leaves the query untouched when no technique is given', () => {
    navigate({ agentId: 'agent-1', techniqueId: null });

    expect(dispatchedQuery()).toBe('agent.id: "agent-1"');
  });

  it('does nothing when a technique arrives with no scope to narrow', () => {
    navigate({ techniqueId: 'T1059' });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it('does nothing when the pivot carries no identifier', () => {
    navigate({ timestamp: '2026-06-04T10:40:24.965Z' });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it('clears leftover app filters so they cannot narrow the pivot', () => {
    navigate({ agentId: 'agent-1' });

    expect(mockSetAppFilters).toHaveBeenCalledWith([]);
  });
});
