/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of, Subject, throwError } from 'rxjs';
import { parseCodexSessions } from './codex_model';
import { useCodexContent } from './use_codex_content';
import type { CodexDocument, CodexSearchResponse } from './codex_types';

const mockSearch = jest.fn();
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: { search: mockSearch } } } }),
}));
const doc: CodexDocument = {
  '@timestamp': '2026-10-12T12:00:00Z',
  event: { id: 'summary', action: 'session', outcome: 'unknown' },
  agent: { id: 'install', name: 'Codex', type: 'codex' },
  session: {
    id: 'session',
    start: '2026-10-12T12:00:00Z',
    last_seen: '2026-10-12T13:00:00Z',
    tool_call_count: 0,
    success_count: 0,
    failure_count: 0,
    unknown_count: 0,
    tools: [],
  },
  source: { kind: 'codex_local_session', file_hash: 'hash', schema_version: 1 },
  kibana: { space_id: 'test' },
  content: {
    mode: 'redacted_local',
    redaction_version: 1,
    prompts: [
      {
        id: 'prompt',
        timestamp: '2026-10-12T12:00:00Z',
        text: 'Recorded prompt',
        redacted: false,
        truncated: false,
        source: 'item_completed.UserMessage',
      },
    ],
    prompts_total: 1,
  },
};
const response: CodexSearchResponse = {
  _shards: { total: 1, failed: 0 },
  hits: {
    total: { value: 1, relation: 'eq' },
    hits: [{ _index: 'logs-codex.entity_intelligence-test', _id: 'doc-one', _source: doc }],
  },
};
const session = parseCodexSessions(response, 'test')[0];
const wrapper = () => {
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
  mockSearch.mockReturnValue(of({ rawResponse: response }));
});

it('fetches only the exact source and clears content after authorization fails', async () => {
  const { result } = renderHook(() => useCodexContent('test', session), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.session?.prompts).toHaveLength(1));
  expect(mockSearch.mock.calls[0][0].params.size).toBe(1);
  expect(mockSearch.mock.calls[0][0].params.query.bool.filter).toContainEqual({
    ids: { values: ['doc-one'] },
  });
  mockSearch.mockReturnValue(throwError(() => new Error('Forbidden')));
  act(() => {
    void result.current.refetch();
  });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.session).toBeUndefined();
});

it('rejects scope changes before querying or exposing cached content', () => {
  const { result } = renderHook(() => useCodexContent('other-space', session), {
    wrapper: wrapper(),
  });
  expect(result.current.unavailable).toBe(true);
  expect(mockSearch).not.toHaveBeenCalled();
});

it('rejects a mismatched document ID even when the returned session matches', async () => {
  mockSearch.mockReturnValue(
    of({
      rawResponse: {
        ...response,
        hits: { ...response.hits, hits: [{ ...response.hits.hits[0], _id: 'different-document' }] },
      },
    })
  );
  const { result } = renderHook(() => useCodexContent('test', session), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.session).toBeUndefined();
});

it('hides previously loaded content while a fresh authorization request is pending', async () => {
  const { result } = renderHook(() => useCodexContent('test', session), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.session?.prompts).toHaveLength(1));
  const pending = new Subject<{ rawResponse: CodexSearchResponse }>();
  mockSearch.mockReturnValue(pending);
  act(() => {
    void result.current.refetch();
  });
  await waitFor(() => expect(result.current.isLoading).toBe(true));
  expect(result.current.session).toBeUndefined();
  act(() => {
    pending.next({ rawResponse: response });
    pending.complete();
  });
  await waitFor(() => expect(result.current.session?.prompts).toHaveLength(1));
});
