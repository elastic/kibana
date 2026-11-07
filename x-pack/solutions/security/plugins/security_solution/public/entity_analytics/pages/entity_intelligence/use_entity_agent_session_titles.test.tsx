/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of, throwError } from 'rxjs';
import type { CodexDocument, CodexHit, CodexSearchResponse } from './ai_agents/codex_types';
import type { AgentSearchRequest } from './ai_agents/queries';
import type { SecurityFinding } from './security_findings/types';
import { useEntityAgentSessionTitles } from './use_entity_agent_session_titles';

const mockSearch = jest.fn();
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: { search: mockSearch } } } }),
}));

const finding = (agentId = 'agent-1', sessionId = 'session-1'): SecurityFinding => ({
  id: `${agentId}-${sessionId}`,
  timestamp: '2026-10-14T12:00:00Z',
  title: 'Protected lookup',
  severity: 'high',
  status: 'open',
  kind: 'detection',
  outcome: 'unknown',
  rule: { name: 'Policy' },
  source: { index: 'alerts', id: `${agentId}-${sessionId}` },
  ancestors: [],
  entityIds: [],
  agent: { provider: 'codex', id: agentId, sessionId },
});

const document = (agentId = 'agent-1', sessionId = 'session-1'): CodexDocument => ({
  '@timestamp': '2026-10-14T12:00:00Z',
  event: { id: `event-${sessionId}`, action: 'session', outcome: 'unknown' },
  agent: { id: agentId, name: 'Codex', type: 'codex' },
  session: {
    id: sessionId,
    start: '2026-10-14T12:00:00Z',
    last_seen: '2026-10-14T12:01:00Z',
    tool_call_count: 0,
    failure_count: 0,
    success_count: 0,
    unknown_count: 0,
    tools: [],
  },
  content: {
    mode: 'redacted_local',
    redaction_version: 1,
    title: { text: `Title ${sessionId}`, source: 'session', redacted: false, truncated: false },
  },
  source: { kind: 'codex_local_session', file_hash: 'hash', schema_version: 1 },
  kibana: { space_id: 'default' },
});

const hit = (doc = document()): CodexHit => ({
  _index: 'logs-codex.entity_intelligence-default',
  _id: `${doc.agent.id}-${doc.session.id}`,
  _source: doc,
});
const response = (hits: CodexHit[] = [hit()]): CodexSearchResponse => ({
  hits: { total: { value: hits.length, relation: 'eq' }, hits },
});
const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.client = client;
  return Wrapper;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch.mockReturnValue(of({ rawResponse: response() }));
});

it('queries exact installation/session pairs, preserving source and space constraints', async () => {
  const findings = [finding(), finding('agent-2', 'session-2')];
  mockSearch.mockReturnValue(
    of({
      rawResponse: response([
        hit(),
        hit(document('agent-2', 'session-2')),
        hit(document('agent-1', 'session-2')),
      ]),
    })
  );
  const { result } = renderHook(() => useEntityAgentSessionTitles('default', findings), {
    wrapper: makeWrapper(),
  });
  await waitFor(() => expect(result.current).toHaveLength(2));
  expect(result.current.map(({ title }) => title)).toEqual(['Title session-1', 'Title session-2']);
  const request: AgentSearchRequest = mockSearch.mock.calls[0][0];
  expect(request.params).toEqual(
    expect.objectContaining({
      index: 'logs-codex.entity_intelligence-default',
      size: 4,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  { term: { 'kibana.space_id': 'default' } },
                  { term: { 'event.action': 'session' } },
                  { range: { 'session.last_seen': { gte: 'now-30d', lte: 'now' } } },
                ],
              },
            },
            {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    bool: {
                      filter: [
                        { term: { 'agent.id': 'agent-1' } },
                        { term: { 'session.id': 'session-1' } },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        { term: { 'agent.id': 'agent-2' } },
                        { term: { 'session.id': 'session-2' } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    })
  );
  expect(mockSearch.mock.calls[0][1]).toEqual({ abortSignal: expect.any(AbortSignal) });
});

it('bounds and deduplicates the requested pairs before searching', async () => {
  const findings = Array.from({ length: 30 }, (_, index) =>
    finding(`agent-${index}`, `session-${index}`)
  );
  mockSearch.mockReturnValue(of({ rawResponse: response([]) }));
  renderHook(() => useEntityAgentSessionTitles('default', [...findings, ...findings]), {
    wrapper: makeWrapper(),
  });
  await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
  const request: AgentSearchRequest = mockSearch.mock.calls[0][0];
  expect(request.params.size).toBe(48);
  const query = JSON.stringify(request.params.query);
  expect(query.match(/"agent.id"/g)).toHaveLength(24);
  expect(query.match(/"session.id"/g)).toHaveLength(24);
});

it.each(['space', 'provider', 'index', 'ambiguous'])(
  'rejects %s session evidence even when the search response contains it',
  async (kind) => {
    const doc = document();
    const hits =
      kind === 'space'
        ? [hit({ ...doc, kibana: { space_id: 'other' } })]
        : kind === 'provider'
        ? [hit({ ...doc, source: { ...doc.source, kind: 'cursor_local_session' } })]
        : kind === 'index'
        ? [{ ...hit(), _index: 'logs-codex.entity_intelligence-other' }]
        : [hit(), { ...hit(), _id: 'conflicting-document' }];
    mockSearch.mockReturnValue(of({ rawResponse: response(hits) }));
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useEntityAgentSessionTitles('default', [finding()]), {
      wrapper,
    });
    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(wrapper.client.isFetching()).toBe(0));
    expect(result.current).toEqual([]);
  }
);

it.each(['timeout', 'shards', 'missing_total', 'truncated', 'lower_bound'])(
  'rejects %s results instead of assuming a unique session',
  async (kind) => {
    const changed: CodexSearchResponse = response();
    if (kind === 'timeout') changed.timed_out = true;
    if (kind === 'shards') changed._shards = { total: 2, failed: 1 };
    if (kind === 'missing_total') changed.hits.total = undefined;
    if (kind === 'truncated') changed.hits.total = 4;
    if (kind === 'lower_bound') changed.hits.total = { value: 1, relation: 'gte' };
    mockSearch.mockReturnValue(of({ rawResponse: changed }));
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useEntityAgentSessionTitles('default', [finding()]), {
      wrapper,
    });
    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(wrapper.client.isFetching()).toBe(0));
    expect(result.current).toEqual([]);
  }
);

it('uses a stable paired cache key while separating spaces and providers', async () => {
  mockSearch.mockImplementation((request: AgentSearchRequest) => {
    const index = String(request.params.index);
    const isCursor = index.includes('cursor');
    const spaceId = index.endsWith('-other') ? 'other' : 'default';
    const docs = [document(), document('agent-2', 'session-2')].map((doc) => ({
      ...hit({
        ...doc,
        kibana: { space_id: spaceId },
        source: { ...doc.source, kind: isCursor ? 'cursor_local_session' : 'codex_local_session' },
      }),
      _index: index,
    }));
    return of({ rawResponse: response(docs) });
  });
  const findings = [finding(), finding('agent-2', 'session-2')];
  const { result, rerender } = renderHook(
    ({ spaceId, items }) => useEntityAgentSessionTitles(spaceId, items),
    { wrapper: makeWrapper(), initialProps: { spaceId: 'default', items: findings } }
  );
  await waitFor(() => expect(result.current).toHaveLength(2));
  rerender({ spaceId: 'default', items: [...findings].reverse() });
  expect(mockSearch).toHaveBeenCalledTimes(1);
  rerender({ spaceId: 'other', items: findings });
  expect(result.current).toEqual([]);
  await waitFor(() =>
    expect(result.current[0]?.source.index).toBe('logs-codex.entity_intelligence-other')
  );
  rerender({
    spaceId: 'other',
    items: findings.map((item) => ({
      ...item,
      agent: item.agent ? { ...item.agent, provider: 'cursor' } : undefined,
    })),
  });
  expect(result.current).toEqual([]);
  await waitFor(() => expect(result.current[0]?.provider).toBe('cursor'));
  expect(mockSearch).toHaveBeenCalledTimes(3);
});

it('does not show a previous session title after a failed new lookup', async () => {
  const wrapper = makeWrapper();
  const { result, rerender } = renderHook(
    ({ items }) => useEntityAgentSessionTitles('default', items),
    { wrapper, initialProps: { items: [finding()] } }
  );
  await waitFor(() => expect(result.current[0]?.title).toBe('Title session-1'));
  mockSearch.mockReturnValue(throwError(() => new Error('Denied')));
  rerender({ items: [finding('other-agent', 'other-session')] });
  expect(result.current).toEqual([]);
  await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(wrapper.client.isFetching()).toBe(0));
  expect(result.current).toEqual([]);
});

it.each([undefined, 'default,*', ''])(
  'does not search unresolved or unsafe space %s',
  (spaceId) => {
    const { result } = renderHook(() => useEntityAgentSessionTitles(spaceId, [finding()]), {
      wrapper: makeWrapper(),
    });
    expect(result.current).toEqual([]);
    expect(mockSearch).not.toHaveBeenCalled();
  }
);

it('does not query Agent Builder through external-agent log indices', () => {
  const builder: SecurityFinding = {
    ...finding(),
    agent: { id: 'builder', provider: 'agent_builder', sessionId: 'conversation' },
  };
  renderHook(() => useEntityAgentSessionTitles('default', [builder]), { wrapper: makeWrapper() });
  expect(mockSearch).not.toHaveBeenCalled();
});
