/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of } from 'rxjs';
import { useSecurityFindings } from './use_security_findings';
import type { SecurityAlertHit, SecurityFindingScope, SecuritySearchResponse } from './types';

const mockFetchAlerts = jest.fn();
const mockSearch = jest.fn();
jest.mock('../../../../detections/containers/detection_engine/alerts/api', () => ({
  fetchQueryAlerts: (params: object) => mockFetchAlerts(params),
}));
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: { search: mockSearch } } } }),
}));
const source: SecurityAlertHit = {
  _index: 'logs-entity_intelligence.security-default',
  _id: 'native-match',
  _source: {
    kibana: { space_id: 'default' },
    entity_intelligence: {
      schema_version: 1,
      control: { id: 'policy-1' },
      agent: { id: 'agent', provider: 'agent_builder', session_id: 'trace:invocation' },
    },
  },
};
const alert: SecurityAlertHit = {
  _index: '.internal.alerts-security.alerts-default-000001',
  _id: 'alert-1',
  _source: {
    '@timestamp': '2026-10-14T12:00:00Z',
    'kibana.alert.rule.name': 'AI policy match',
    'kibana.alert.severity': 'high',
    'kibana.space_ids': ['default'],
    'kibana.alert.ancestors': [{ index: source._index, id: source._id }],
    agent: { id: 'agent', type: 'agent_builder' },
    entity_intelligence: {
      schema_version: 1,
      control: {
        id: 'policy-1',
        name: 'Protected data',
        mode: 'monitor',
        decision: 'deny',
        outcome: 'unknown',
        engine: 'entity_intelligence.ai_policy_monitor',
      },
      agent: { id: 'agent', provider: 'agent_builder', session_id: 'trace:invocation' },
    },
  },
};
const response = (hits: SecurityAlertHit[], total = hits.length): SecuritySearchResponse => ({
  hits: { total: { value: total, relation: 'eq' }, hits },
  _shards: { total: 1, failed: 0 },
});
const renderFindings = (scope: SecurityFindingScope = { type: 'policy', policyId: 'policy-1' }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSecurityFindings(scope, 'default'), { wrapper });
};
beforeEach(() => {
  jest.clearAllMocks();
  mockSearch.mockReturnValue(of({ rawResponse: response([source]) }));
  mockFetchAlerts.mockResolvedValue(response([alert]));
});

it('shows monitor findings only after resolving the selected policy sources and exact alert ancestry', async () => {
  const { result } = renderFindings();
  await waitFor(() => expect(result.current.findings).toHaveLength(1));
  expect(result.current).toMatchObject({ total: 1, partial: false });
  expect(result.current.findings[0]).toMatchObject({
    kind: 'detection',
    outcome: 'unknown',
    policy: { id: 'policy-1', mode: 'monitor' },
  });
  expect(JSON.stringify(mockSearch.mock.calls[0][0])).toContain('entity_intelligence.control.id');
  expect(JSON.stringify(mockFetchAlerts.mock.calls[0][0].query)).toContain('native-match');
});

it('rejects cross-matched ancestor array elements even when both ES predicates match', async () => {
  mockFetchAlerts.mockResolvedValue(
    response([
      {
        ...alert,
        _source: {
          ...alert._source,
          'kibana.alert.ancestors': [
            { index: source._index, id: 'other-document' },
            { index: 'other-index', id: source._id },
          ],
        },
      },
    ])
  );
  const { result } = renderFindings();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current).toMatchObject({ findings: [], total: undefined, partial: true });
});

it('rejects an alert carrying a different policy despite an otherwise matching source ancestor', async () => {
  mockFetchAlerts.mockResolvedValue(
    response([
      {
        ...alert,
        _source: {
          ...alert._source,
          entity_intelligence: {
            ...alert._source?.entity_intelligence,
            control: { ...alert._source?.entity_intelligence?.control, id: 'other-policy' },
          },
        },
      },
    ])
  );
  const { result } = renderFindings();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current).toMatchObject({ findings: [], total: undefined, partial: true });
});

it.each<SecurityAlertHit>([
  { ...source, _index: 'logs-entity_intelligence.security-other' },
  { ...source, _source: { ...source._source, kibana: { space_id: 'other' } } },
  {
    ...source,
    _source: {
      ...source._source,
      entity_intelligence: { schema_version: 1, control: { id: 'other-policy' } },
    },
  },
  {
    ...source,
    _source: {
      ...source._source,
      entity_intelligence: { schema_version: 1, control: { id: ['policy-1', 'other-policy'] } },
    },
  },
])(
  'never broadens the alert search after an untrusted or ambiguous policy source: %o',
  async (hit) => {
    mockSearch.mockReturnValue(of({ rawResponse: response([hit]) }));
    const { result } = renderFindings();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ findings: [], total: undefined, partial: true });
    expect(mockFetchAlerts).not.toHaveBeenCalled();
  }
);

it('reports a complete empty policy finding set without claiming a monitored clean session', async () => {
  mockSearch.mockReturnValue(of({ rawResponse: response([]) }));
  const { result } = renderFindings();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current).toMatchObject({ findings: [], total: 0, partial: false });
  expect(mockFetchAlerts).not.toHaveBeenCalled();
});

it('keeps bounded source counts partial instead of displaying an authoritative alert total', async () => {
  mockSearch.mockReturnValue(of({ rawResponse: response([source], 1500) }));
  const { result } = renderFindings();
  await waitFor(() => expect(result.current.findings).toHaveLength(1));
  expect(result.current).toMatchObject({ total: undefined, partial: true });
});

it('rejects another Agent Builder invocation in the same trace before searching alerts', async () => {
  mockSearch.mockReturnValue(
    of({
      rawResponse: response([
        {
          ...source,
          _source: {
            ...source._source,
            'trace.id': 'trace',
            entity_intelligence: {
              ...source._source?.entity_intelligence,
              agent: { id: 'agent', provider: 'agent_builder', session_id: 'trace:sibling' },
            },
          },
        },
      ]),
    })
  );
  const { result } = renderFindings({
    type: 'agent',
    provider: 'agent_builder',
    agentId: 'agent',
    traceId: 'trace',
    sessionId: 'trace:invocation',
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current).toMatchObject({ findings: [], partial: true });
  expect(mockFetchAlerts).not.toHaveBeenCalled();
});
