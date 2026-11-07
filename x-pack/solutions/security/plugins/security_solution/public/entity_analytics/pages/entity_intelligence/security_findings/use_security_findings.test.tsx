/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of, throwError } from 'rxjs';
import { EntityType } from '../../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from '../common';
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

const scope: Extract<SecurityFindingScope, { type: 'agent' }> = {
  type: 'agent',
  provider: 'codex',
  agentId: 'agent-1',
  sessionId: 'session-1',
};
const source: SecurityAlertHit = {
  _index: 'logs-entity_intelligence.security-default',
  _id: 'event-1',
  _source: {
    kibana: { space_id: 'default' },
    entity_intelligence: {
      schema_version: 1,
      agent: { id: 'agent-1', provider: 'codex', session_id: 'session-1' },
    },
  },
};
const alert: SecurityAlertHit = {
  _index: '.internal.alerts-security.alerts-default-000001',
  _id: 'alert-1',
  _source: {
    '@timestamp': '2026-10-13T12:00:00Z',
    'kibana.alert.rule.name': 'Security detection',
    'kibana.alert.severity': 'high',
    'kibana.space_ids': ['default'],
    'kibana.alert.ancestors': [{ index: source._index, id: source._id }],
    agent: { id: 'agent-1', type: 'codex' },
  },
};
const response = (hits: SecurityAlertHit[], total = hits.length): SecuritySearchResponse => ({
  hits: { total: { value: total, relation: 'eq' }, hits },
  _shards: { total: 1, failed: 0 },
});
const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
};
const useFindings = ({
  selectedScope,
  spaceId,
}: {
  selectedScope: SecurityFindingScope;
  spaceId?: string;
}) => useSecurityFindings(selectedScope, spaceId);
const initialProps = { selectedScope: scope as SecurityFindingScope, spaceId: 'default' };

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch.mockReturnValue(of({ rawResponse: response([source]) }));
  mockFetchAlerts.mockResolvedValue(response([alert]));
});

it('loads real alerts after proving exact source session scope', async () => {
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.findings).toHaveLength(1));
  expect(result.current.total).toBe(1);
  expect(result.current.partial).toBe(false);
  expect(mockSearch).toHaveBeenCalledWith(expect.any(Object), {
    abortSignal: expect.any(AbortSignal),
  });
  expect(mockFetchAlerts).toHaveBeenCalledWith(
    expect.objectContaining({ signal: expect.any(AbortSignal) })
  );
  expect(JSON.stringify(mockFetchAlerts.mock.calls[0][0].query)).toContain('event-1');
});

it('loads the all-identity queue without requiring a gateway source lookup', async () => {
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, {
    wrapper: Wrapper,
    initialProps: { ...initialProps, selectedScope: { type: 'all' } },
  });
  await waitFor(() => expect(result.current.findings).toHaveLength(1));
  expect(mockSearch).not.toHaveBeenCalled();
});

it.each([
  ['source index', { ...source, _index: 'another-index' }],
  ['space', { ...source, _source: { ...source._source, kibana: { space_id: 'finance' } } }],
  [
    'installation',
    {
      ...source,
      _source: {
        ...source._source,
        entity_intelligence: {
          schema_version: 1,
          agent: { id: 'other', provider: 'codex', session_id: 'session-1' },
        },
      },
    },
  ],
  [
    'provider',
    {
      ...source,
      _source: {
        ...source._source,
        entity_intelligence: {
          schema_version: 1,
          agent: { id: 'agent-1', provider: 'cursor', session_id: 'session-1' },
        },
      },
    },
  ],
  [
    'session',
    {
      ...source,
      _source: {
        ...source._source,
        entity_intelligence: {
          schema_version: 1,
          agent: { id: 'agent-1', provider: 'codex', session_id: 'other' },
        },
      },
    },
  ],
] as Array<[string, SecurityAlertHit]>)(
  'rejects a mismatched source %s without broadening the alert search',
  async (_label, hit) => {
    mockSearch.mockReturnValue(of({ rawResponse: response([hit]) }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(useFindings, { wrapper: Wrapper, initialProps });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.findings).toEqual([]);
    expect(result.current.partial).toBe(true);
    expect(mockFetchAlerts).not.toHaveBeenCalled();
  }
);

it('does not claim missing gateway telemetry establishes a clean session', async () => {
  mockSearch.mockReturnValue(of({ rawResponse: response([]) }));
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current).toMatchObject({ findings: [], total: undefined, partial: true });
  expect(mockFetchAlerts).not.toHaveBeenCalled();
});

it('reports source authorization errors rather than interpreting them as zero', async () => {
  mockSearch.mockReturnValue(throwError(() => new Error('Forbidden')));
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.total).toBeUndefined();
  expect(mockFetchAlerts).not.toHaveBeenCalled();
});

it('rejects ancestor predicates that matched different array elements', async () => {
  mockFetchAlerts.mockResolvedValue(
    response([
      {
        ...alert,
        _source: {
          ...alert._source,
          'kibana.alert.ancestors': [
            { index: source._index, id: 'another-event' },
            { index: 'another-index', id: source._id },
          ],
        },
      },
    ])
  );
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.findings).toEqual([]);
  expect(result.current.total).toBeUndefined();
  expect(result.current.partial).toBe(true);
});

it('reports bounds on either source event or alert results', async () => {
  mockSearch.mockReturnValue(of({ rawResponse: response([source], 2000) }));
  mockFetchAlerts.mockResolvedValue(response([alert], 150));
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.findings).toHaveLength(1));
  expect(result.current).toMatchObject({ total: undefined, partial: true });
});

it('hides previous findings immediately during refresh and after access is revoked', async () => {
  const { client, Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.findings).toHaveLength(1));
  let rejectRequest: ((error: Error) => void) | undefined;
  mockFetchAlerts.mockImplementationOnce(
    () =>
      new Promise<SecuritySearchResponse>((_resolve, reject) => {
        rejectRequest = reject;
      })
  );
  act(() => {
    void client.invalidateQueries();
  });
  await waitFor(() => expect(result.current.isRefreshing).toBe(true));
  expect(result.current.findings).toEqual([]);
  expect(result.current.total).toBeUndefined();
  await act(async () => {
    rejectRequest?.(new Error('Forbidden'));
  });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.findings).toEqual([]);
});

it.each([
  ['space', { ...initialProps, spaceId: 'finance' }],
  ['session', { ...initialProps, selectedScope: { ...scope, sessionId: 'session-2' } }],
  ['provider', { ...initialProps, selectedScope: { ...scope, provider: 'cursor' as const } }],
])('never reuses findings when %s changes', async (_label, props) => {
  const { Wrapper } = makeWrapper();
  const { result, rerender } = renderHook(useFindings, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.findings).toHaveLength(1));
  mockSearch.mockReturnValue(throwError(() => new Error('Forbidden')));
  rerender(props);
  expect(result.current.findings).toEqual([]);
  await waitFor(() => expect(result.current.unavailable).toBe(true));
});

it('disables invalid space identifiers without issuing requests', () => {
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, {
    wrapper: Wrapper,
    initialProps: { ...initialProps, spaceId: 'default*' },
  });
  expect(result.current.unavailable).toBe(true);
  expect(result.current.isLoading).toBe(false);
  expect(mockFetchAlerts).not.toHaveBeenCalled();
  expect(mockSearch).not.toHaveBeenCalled();
});

it('discards inactive query data', async () => {
  const { client, Wrapper } = makeWrapper();
  const { result, unmount } = renderHook(useFindings, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.findings).toHaveLength(1));
  unmount();
  await waitFor(() => expect(client.getQueryCache().getAll()).toHaveLength(0));
});

const selectedEntity: IntelligenceEntity = {
  id: 'user:alex@laptop-one',
  name: 'Alex Chen',
  identifierValue: 'alex.chen',
  type: EntityType.user,
  riskScoreNorm: undefined,
  riskLevel: 'Unknown',
  criticality: undefined,
  source: undefined,
  lastSeen: undefined,
};

it('rejects an explicit unrelated EUID even when the user name matches', async () => {
  mockFetchAlerts.mockResolvedValue(
    response([
      {
        ...alert,
        _source: {
          ...alert._source,
          user: { name: 'alex.chen' },
          entity: { id: 'user:alex@laptop-two' },
        },
      },
    ])
  );
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, {
    wrapper: Wrapper,
    initialProps: {
      ...initialProps,
      selectedScope: { type: 'entity', entity: selectedEntity },
    },
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.findings).toEqual([]);
  expect(result.current).toMatchObject({ total: undefined, partial: true });
});

it('prefers the exact EUID even when the display or account name changed', async () => {
  mockFetchAlerts.mockResolvedValue(
    response([
      {
        ...alert,
        _source: {
          ...alert._source,
          user: { name: 'alex.new-name' },
          entity: { id: selectedEntity.id },
        },
      },
    ])
  );
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, {
    wrapper: Wrapper,
    initialProps: {
      ...initialProps,
      selectedScope: { type: 'entity', entity: selectedEntity },
    },
  });
  await waitFor(() => expect(result.current.findings).toHaveLength(1));
  expect(result.current).toMatchObject({ total: 1, partial: false });
});

it('preserves legacy name evidence while marking canonical identity coverage partial', async () => {
  mockFetchAlerts.mockResolvedValue(
    response([{ ...alert, _source: { ...alert._source, user: { name: 'alex.chen' } } }])
  );
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, {
    wrapper: Wrapper,
    initialProps: {
      ...initialProps,
      selectedScope: { type: 'entity', entity: selectedEntity },
    },
  });
  await waitFor(() => expect(result.current.findings).toHaveLength(1));
  expect(result.current).toMatchObject({ total: undefined, partial: true });
});

it.each([
  ['different subject', 'other-subject'],
  ['missing subject', undefined],
  ['ambiguous subjects', ['google-subject', 'other-subject']],
])(
  'rejects same-name user fallback with %s when the entity stores an account ID',
  async (_label, id) => {
    mockFetchAlerts.mockResolvedValue(
      response([{ ...alert, _source: { ...alert._source, user: { name: 'alex.chen', id } } }])
    );
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(useFindings, {
      wrapper: Wrapper,
      initialProps: {
        ...initialProps,
        selectedScope: {
          type: 'entity',
          entity: { ...selectedEntity, identityId: 'google-subject' },
        },
      },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.findings).toEqual([]);
    expect(result.current.partial).toBe(true);
  }
);

it('accepts the exact user subject and name without an EUID, retaining coverage limits', async () => {
  mockFetchAlerts.mockResolvedValue(
    response([
      {
        ...alert,
        _source: { ...alert._source, user: { name: 'alex.chen', id: 'google-subject' } },
      },
    ])
  );
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, {
    wrapper: Wrapper,
    initialProps: {
      ...initialProps,
      selectedScope: {
        type: 'entity',
        entity: { ...selectedEntity, identityId: 'google-subject' },
      },
    },
  });
  await waitFor(() => expect(result.current.findings).toHaveLength(1));
  expect(result.current).toMatchObject({ total: undefined, partial: true });
});

it('keeps explicitly related EUID evidence even if the alert actor is a different subject', async () => {
  mockFetchAlerts.mockResolvedValue(
    response([
      {
        ...alert,
        _source: {
          ...alert._source,
          entity: { id: selectedEntity.id },
          user: { name: 'other.actor', id: 'other-subject' },
        },
      },
    ])
  );
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, {
    wrapper: Wrapper,
    initialProps: {
      ...initialProps,
      selectedScope: {
        type: 'entity',
        entity: { ...selectedEntity, identityId: 'google-subject' },
      },
    },
  });
  await waitFor(() => expect(result.current.findings).toHaveLength(1));
  expect(result.current).toMatchObject({ total: 1, partial: false });
});

it('rejects unrelated legacy names in a typed entity scope', async () => {
  mockFetchAlerts.mockResolvedValue(
    response([
      {
        ...alert,
        _source: { ...alert._source, host: { name: 'alex.chen' }, user: { name: 'another-user' } },
      },
    ])
  );
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, {
    wrapper: Wrapper,
    initialProps: {
      ...initialProps,
      selectedScope: { type: 'entity', entity: selectedEntity },
    },
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.findings).toEqual([]);
});

it('orders the loaded alert sample by observed event time rather than rule execution time', async () => {
  mockFetchAlerts.mockResolvedValue(
    response([
      {
        ...alert,
        _id: 'detected-later',
        _source: { ...alert._source, 'kibana.alert.original_time': '2026-10-13T11:45:00Z' },
      },
      {
        ...alert,
        _id: 'observed-later',
        _source: {
          ...alert._source,
          '@timestamp': '2026-10-13T11:58:00Z',
          'kibana.alert.original_time': '2026-10-13T11:55:00Z',
        },
      },
    ])
  );
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.findings).toHaveLength(2));
  expect(result.current.findings.map((finding) => finding.source.id)).toEqual([
    'observed-later',
    'detected-later',
  ]);
});

const traceScope: SecurityFindingScope = {
  type: 'agent',
  provider: 'agent_builder',
  agentId: 'agent-1',
  traceId: 'selected-trace',
};

it('rejects a multi-trace alert even when the selected trace is its first value', async () => {
  mockFetchAlerts.mockResolvedValue(
    response([
      {
        ...alert,
        _source: {
          ...alert._source,
          agent: { id: 'agent-1', type: 'agent_builder' },
          trace: { id: ['selected-trace', 'another-trace'] },
        },
      },
    ])
  );
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, {
    wrapper: Wrapper,
    initialProps: { ...initialProps, selectedScope: traceScope },
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.findings).toEqual([]);
  expect(result.current).toMatchObject({ total: undefined, partial: true });
  expect(mockSearch).not.toHaveBeenCalled();
});

it.each<{ trace: string | string[] }>([{ trace: 'selected-trace' }, { trace: ['selected-trace'] }])(
  'accepts an unambiguous trace identifier from alert evidence: %p',
  async ({ trace }) => {
    mockFetchAlerts.mockResolvedValue(
      response([
        {
          ...alert,
          _source: {
            ...alert._source,
            agent: { id: 'agent-1', type: 'agent_builder' },
            'trace.id': trace,
          },
        },
      ])
    );
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(useFindings, {
      wrapper: Wrapper,
      initialProps: { ...initialProps, selectedScope: traceScope },
    });
    await waitFor(() => expect(result.current.findings).toHaveLength(1));
    expect(result.current.findings[0].traceId).toBe('selected-trace');
    expect(result.current).toMatchObject({ total: 1, partial: false });
  }
);

it('rejects an ambiguous source-event trace before searching for session alerts', async () => {
  mockSearch.mockReturnValue(
    of({
      rawResponse: response([
        {
          ...source,
          _source: { ...source._source, trace: { id: ['selected-trace', 'another-trace'] } },
        },
      ]),
    })
  );
  const { Wrapper } = makeWrapper();
  const { result } = renderHook(useFindings, {
    wrapper: Wrapper,
    initialProps: { ...initialProps, selectedScope: { ...scope, traceId: 'selected-trace' } },
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.findings).toEqual([]);
  expect(result.current.partial).toBe(true);
  expect(mockFetchAlerts).not.toHaveBeenCalled();
});

it.each<{ trace: string | string[] }>([{ trace: 'selected-trace' }, { trace: ['selected-trace'] }])(
  'accepts scalar or singleton source-event trace metadata: %p',
  async ({ trace }) => {
    mockSearch.mockReturnValue(
      of({
        rawResponse: response([
          {
            ...source,
            _source: { ...source._source, 'trace.id': trace },
          },
        ]),
      })
    );
    mockFetchAlerts.mockResolvedValue(
      response([
        {
          ...alert,
          _source: { ...alert._source, trace: { id: 'selected-trace' } },
        },
      ])
    );
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(useFindings, {
      wrapper: Wrapper,
      initialProps: { ...initialProps, selectedScope: { ...scope, traceId: 'selected-trace' } },
    });
    await waitFor(() => expect(result.current.findings).toHaveLength(1));
    expect(result.current.findings[0].traceId).toBe('selected-trace');
    expect(result.current).toMatchObject({ total: 1, partial: false });
  }
);
