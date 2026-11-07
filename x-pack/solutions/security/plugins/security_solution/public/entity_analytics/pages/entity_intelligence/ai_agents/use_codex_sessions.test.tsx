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
import { parseCodexSessions } from './codex_model';
import { buildCodexToolsQuery, CODEX_CONTENT_FIELDS, CODEX_SOURCE_FIELDS } from './codex_queries';
import { useCodexSessions, useCodexSessionTools } from './use_codex_sessions';
import type { CodexDocument, CodexSearchResponse } from './codex_types';

const mockSearch = jest.fn();
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: { search: mockSearch } } } }),
}));

const doc: CodexDocument = {
  '@timestamp': '2026-10-12T12:00:00Z',
  event: { id: 'summary', action: 'session', outcome: 'unknown', ingested: '2026-10-12T13:01:00Z' },
  agent: { id: 'codex:install-one', name: 'Codex', type: 'codex' },
  session: {
    id: 'session-one',
    start: '2026-10-12T12:00:00Z',
    last_seen: '2026-10-12T13:00:00Z',
    summary_complete: true,
    tool_call_count: 1,
    failure_count: 0,
    success_count: 0,
    unknown_count: 1,
    tools: [
      { name: 'exec_command', count: 1, failure_count: 0, success_count: 0, unknown_count: 1 },
    ],
  },
  source: { kind: 'codex_local_session', file_hash: 'file-hash', schema_version: 1 },
  kibana: { space_id: 'marketing' },
};
const response = (docs: CodexDocument[]): CodexSearchResponse => ({
  _shards: { total: 1, failed: 0 },
  hits: {
    hits: docs.map((item, index) => ({
      _index: 'logs-codex.entity_intelligence-marketing',
      _id: `doc-${index}`,
      _source: item,
    })),
    total: { value: docs.length, relation: 'eq' },
  },
});
const session = parseCodexSessions(response([doc]), 'marketing')[0];
const toolDoc: CodexDocument = {
  ...doc,
  event: { id: 'call-event', action: 'tool_call', outcome: 'unknown' },
  tool: { name: 'exec_command', call: { id: 'call-one' } },
};
const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch.mockReturnValue(of({ rawResponse: response([doc]) }));
});

it('clears previously readable sessions and totals after access is denied during refresh', async () => {
  const { result } = renderHook(() => useCodexSessions('marketing'), { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.sessions).toHaveLength(1));
  expect(result.current.total).toBe(1);
  mockSearch.mockReturnValue(throwError(() => new Error('Forbidden')));
  act(() => {
    void result.current.refetch();
  });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.sessions).toEqual([]);
  expect(result.current.total).toBeUndefined();
  expect(result.current.partial).toBe(false);
});

it('clears previously readable tool evidence and completeness after access is denied', async () => {
  mockSearch.mockReturnValue(of({ rawResponse: response([toolDoc]) }));
  const { result } = renderHook(() => useCodexSessionTools('marketing', session), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.complete).toBe(true));
  expect(result.current.events[0].outcome).toBe('unknown');
  mockSearch.mockReturnValue(throwError(() => new Error('Forbidden')));
  act(() => {
    void result.current.refetch();
  });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.events).toEqual([]);
  expect(result.current.complete).toBe(false);
});

it('does not issue queries before space resolution and keeps cache entries separated by space', async () => {
  const initialProps: { spaceId?: string } = {};
  const { result, rerender } = renderHook(
    ({ spaceId }: { spaceId?: string }) => useCodexSessions(spaceId),
    {
      wrapper: createWrapper(),
      initialProps,
    }
  );
  expect(result.current.unavailable).toBe(true);
  expect(mockSearch).not.toHaveBeenCalled();
  rerender({ spaceId: 'marketing' });
  await waitFor(() => expect(result.current.sessions).toHaveLength(1));
  rerender({ spaceId: 'other-space' });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.sessions).toEqual([]);
  expect(result.current.partial).toBe(true);
  expect(mockSearch).toHaveBeenLastCalledWith(
    expect.objectContaining({
      params: expect.objectContaining({ index: 'logs-codex.entity_intelligence-other-space' }),
    }),
    expect.objectContaining({ abortSignal: expect.any(AbortSignal) })
  );
});

it('reports capped, discarded, and shard-partial session results as partial', async () => {
  mockSearch.mockReturnValue(
    of({
      rawResponse: {
        ...response([doc, { ...doc, kibana: { space_id: 'other-space' } }]),
        _shards: { total: 2, failed: 1 },
        hits: { ...response([doc]).hits, total: { value: 200, relation: 'eq' } },
      },
    })
  );
  const { result } = renderHook(() => useCodexSessions('marketing'), { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.sessions).toHaveLength(1));
  expect(result.current.partial).toBe(true);
  expect(result.current.total).toBe(200);
});

it('does not mark duplicated call IDs or discarded cross-session documents as complete evidence', async () => {
  mockSearch.mockReturnValue(of({ rawResponse: response([toolDoc, toolDoc]) }));
  const twoCalls = { ...session, toolCount: 2 };
  const { result } = renderHook(() => useCodexSessionTools('marketing', twoCalls), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.events).toHaveLength(2));
  expect(result.current.complete).toBe(false);
  mockSearch.mockReturnValue(
    of({
      rawResponse: response([
        toolDoc,
        { ...toolDoc, session: { ...toolDoc.session, id: 'other-session' } },
      ]),
    })
  );
  act(() => {
    void result.current.refetch();
  });
  await waitFor(() => expect(result.current.events).toHaveLength(1));
  expect(result.current.complete).toBe(false);
});

it('invalidates selected-session evidence when a newer import snapshot is selected', async () => {
  mockSearch.mockReturnValue(of({ rawResponse: response([toolDoc]) }));
  const { result, rerender } = renderHook(
    ({ selected }) => useCodexSessionTools('marketing', selected),
    {
      wrapper: createWrapper(),
      initialProps: { selected: session },
    }
  );
  await waitFor(() => expect(result.current.complete).toBe(true));
  mockSearch.mockReturnValue(of({ rawResponse: response([]) }));
  rerender({ selected: { ...session, ingestedAt: '2026-10-12T14:00:00Z' } });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.events).toEqual([]);
  expect(result.current.complete).toBe(false);
  expect(mockSearch).toHaveBeenCalledTimes(2);
});

it('distinguishes missing tool evidence from an observed session with zero calls', async () => {
  mockSearch.mockReturnValue(
    of({ rawResponse: { ...response([]), _shards: { total: 0, failed: 0 } } })
  );
  const { result } = renderHook(() => useCodexSessionTools('marketing', session), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.complete).toBe(false);
  expect(result.current.events).toEqual([]);
});

it('isolates provider caches even when the space, installation and session IDs coincide', async () => {
  mockSearch.mockReturnValue(of({ rawResponse: response([doc]) }));
  const initialProps: { provider: 'codex' | 'cursor' } = { provider: 'codex' };
  const { result, rerender } = renderHook(
    ({ provider }) => useCodexSessions('marketing', provider),
    { wrapper: createWrapper(), initialProps }
  );
  await waitFor(() => expect(result.current.sessions).toHaveLength(1));
  mockSearch.mockReturnValue(
    of({
      rawResponse: response([{ ...doc, source: { ...doc.source, kind: 'cursor_local_session' } }]),
    })
  );
  rerender({ provider: 'cursor' });
  await waitFor(() => expect(result.current.sessions[0]?.provider).toBe('cursor'));
  expect(mockSearch).toHaveBeenLastCalledWith(
    expect.objectContaining({
      params: expect.objectContaining({ index: 'logs-cursor.entity_intelligence-marketing' }),
    }),
    expect.objectContaining({ abortSignal: expect.any(AbortSignal) })
  );
});

it.each(['codex', 'cursor'] as const)(
  'reports a missing %s session stream as unavailable instead of an observed zero',
  async (provider) => {
    mockSearch.mockReturnValue(
      of({ rawResponse: { ...response([]), _shards: { total: 0, failed: 0 } } })
    );
    const { result } = renderHook(() => useCodexSessions('marketing', provider), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.unavailable).toBe(true));
    expect(result.current.sessions).toEqual([]);
    expect(result.current.total).toBeUndefined();
    expect(result.current.partial).toBe(false);
  }
);

it('clears old summaries if the session stream disappears during refresh', async () => {
  const { result } = renderHook(() => useCodexSessions('marketing'), { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.sessions).toHaveLength(1));
  mockSearch.mockReturnValue(
    of({ rawResponse: { ...response([]), _shards: { total: 0, failed: 0 } } })
  );
  act(() => {
    void result.current.refetch();
  });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.sessions).toEqual([]);
  expect(result.current.total).toBeUndefined();
});

it('keeps a readable empty session stream distinct from an unavailable source', async () => {
  mockSearch.mockReturnValue(of({ rawResponse: response([]) }));
  const { result } = renderHook(() => useCodexSessions('marketing'), { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.unavailable).toBe(false);
  expect(result.current.sessions).toEqual([]);
  expect(result.current.total).toBe(0);
  expect(result.current.partial).toBe(false);
});

const withInput = (value: CodexDocument, text: string): CodexDocument => ({
  ...value,
  content: {
    mode: 'redacted_local',
    redaction_version: 1,
    input: {
      text,
      source: 'bubble.toolFormerData.params',
      kind: 'arguments',
      redacted: false,
      truncated: false,
    },
  },
});

it.each(['codex', 'cursor'] as const)(
  'hydrates only referenced %s documents inside the existing space, installation and session scope',
  async (provider) => {
    const index = `logs-${provider}.entity_intelligence-marketing`;
    const first = { ...toolDoc, source: { ...toolDoc.source, kind: `${provider}_local_session` } };
    const second = { ...first, tool: { name: 'other-tool', call: { id: 'call-two' } } };
    const metadata = response([first, second]);
    metadata.hits.hits = metadata.hits.hits.map((hit) => ({ ...hit, _index: index }));
    const content = response([
      withInput(first, 'protected-customer-data.csv'),
      withInput(second, 'unrequested input'),
    ]);
    content.hits.hits = content.hits.hits.map((hit) => ({ ...hit, _index: index }));
    mockSearch
      .mockReturnValueOnce(of({ rawResponse: metadata }))
      .mockReturnValueOnce(of({ rawResponse: content }));
    const selected = { ...session, provider, toolCount: 2 };
    const { result } = renderHook(
      () =>
        useCodexSessionTools('marketing', selected, ['doc-0', 'outside-loaded-sample', 'doc-0']),
      { wrapper: createWrapper() }
    );
    await waitFor(() =>
      expect(result.current.events[0]?.input?.text).toBe('protected-customer-data.csv')
    );
    expect(result.current.events[1].input).toBeUndefined();
    expect(result.current.complete).toBe(true);
    expect(mockSearch).toHaveBeenCalledTimes(2);
    expect(mockSearch.mock.calls[0][0].params._source).toEqual(CODEX_SOURCE_FIELDS);
    const scoped = buildCodexToolsQuery('marketing', session.agentId, session.id, provider);
    expect(mockSearch.mock.calls[1][0]).toEqual({
      params: {
        ...scoped.params,
        size: 1,
        _source: CODEX_CONTENT_FIELDS,
        query: { bool: { filter: [scoped.params.query, { ids: { values: ['doc-0'] } }] } },
      },
    });
    expect(mockSearch.mock.calls[1][1]).toEqual({ abortSignal: expect.any(AbortSignal) });
  }
);

it('does not request content for a finding document absent from the loaded session sample', async () => {
  mockSearch.mockReturnValue(of({ rawResponse: response([toolDoc]) }));
  const { result } = renderHook(
    () => useCodexSessionTools('marketing', session, ['not-in-session']),
    { wrapper: createWrapper() }
  );
  await waitFor(() => expect(result.current.events).toHaveLength(1));
  expect(result.current.events[0].input).toBeUndefined();
  expect(mockSearch).toHaveBeenCalledTimes(1);
});

it('does not merge a same-ID content response from a different backing index', async () => {
  const content = response([withInput(toolDoc, 'other-space input')]);
  content.hits.hits[0]._index = 'logs-codex.entity_intelligence-other-space';
  mockSearch
    .mockReturnValueOnce(of({ rawResponse: response([toolDoc]) }))
    .mockReturnValueOnce(of({ rawResponse: content }));
  const { result } = renderHook(() => useCodexSessionTools('marketing', session, ['doc-0']), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.events).toHaveLength(1));
  expect(result.current.events[0].input).toBeUndefined();
  expect(result.current.events[0].source.index).toBe('logs-codex.entity_intelligence-marketing');
});

it('clears previously hydrated inputs if content access is denied during refresh', async () => {
  const metadata = response([toolDoc]);
  mockSearch
    .mockReturnValueOnce(of({ rawResponse: metadata }))
    .mockReturnValueOnce(
      of({ rawResponse: response([withInput(toolDoc, 'protected-customer-data.csv')]) })
    );
  const { result } = renderHook(() => useCodexSessionTools('marketing', session, ['doc-0']), {
    wrapper: createWrapper(),
  });
  await waitFor(() =>
    expect(result.current.events[0]?.input?.text).toBe('protected-customer-data.csv')
  );
  mockSearch
    .mockReturnValueOnce(of({ rawResponse: metadata }))
    .mockReturnValueOnce(throwError(() => new Error('Forbidden')));
  act(() => {
    void result.current.refetch();
  });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.events).toEqual([]);
  expect(result.current.complete).toBe(false);
});

it('removes hydrated content when findings no longer reference the source document', async () => {
  const metadata = response([toolDoc]);
  mockSearch
    .mockReturnValueOnce(of({ rawResponse: metadata }))
    .mockReturnValueOnce(
      of({ rawResponse: response([withInput(toolDoc, 'previous finding input')]) })
    )
    .mockReturnValueOnce(of({ rawResponse: metadata }));
  const { result, rerender } = renderHook(
    ({ ids }) => useCodexSessionTools('marketing', session, ids),
    { wrapper: createWrapper(), initialProps: { ids: ['doc-0'] } }
  );
  await waitFor(() => expect(result.current.events[0]?.input?.text).toBe('previous finding input'));
  rerender({ ids: [] });
  await waitFor(() => expect(result.current.events).toHaveLength(1));
  expect(result.current.events[0].input).toBeUndefined();
  expect(mockSearch).toHaveBeenCalledTimes(3);
});

it('bounds native evidence hydration to 100 unique source documents', async () => {
  const metadata = response(
    Array.from({ length: 105 }, (_, index) => ({
      ...toolDoc,
      tool: { name: 'read_file', call: { id: `call-${index}` } },
    }))
  );
  const ids = metadata.hits.hits.map((hit) => hit._id);
  mockSearch
    .mockReturnValueOnce(of({ rawResponse: metadata }))
    .mockReturnValueOnce(of({ rawResponse: response([]) }));
  const { result } = renderHook(
    () => useCodexSessionTools('marketing', { ...session, toolCount: 105 }, [...ids, ...ids]),
    { wrapper: createWrapper() }
  );
  await waitFor(() => expect(result.current.events).toHaveLength(105));
  const evidenceRequest = mockSearch.mock.calls[1][0].params;
  expect(evidenceRequest.size).toBe(100);
  const requestedIds = evidenceRequest.query.bool.filter[1].ids.values;
  expect(requestedIds).toHaveLength(100);
  expect(new Set(requestedIds).size).toBe(100);
  expect([...requestedIds].sort()).toEqual([...ids].sort().slice(0, 100));
});
