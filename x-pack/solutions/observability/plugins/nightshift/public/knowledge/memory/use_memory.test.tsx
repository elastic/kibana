/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import {
  MEMORY_KEYWORD_MAX_REQUESTS,
  MEMORY_KEYWORD_SIZE,
  MEMORY_PAGE_SIZE,
  useDeleteMemoryPage,
  useMemoryKeywordPages,
  useMemoryPages,
  useSetMemoryArchived,
} from './use_memory';
import type { MemoryListResult } from './types';

jest.mock('../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const fetchMock = jest.fn();
const addErrorMock = jest.fn();

const summary = (id: string) => ({
  id,
  slug: id.replace('memory_', ''),
  title: `Memory ${id}`,
  content: '',
  tags: ['memory'],
  archived: false,
  categories: [],
  references: [],
  created_at: '',
  updated_at: '',
  created_by: '',
  updated_by: '',
  telemetry: { impressions: 1, conversions: 0, last_impression_time: '' },
  usefulness: 0.5,
  confidence: 0.8,
});

const listResult = (ids: string[], cursor?: string): MemoryListResult => ({
  pages: ids.map(summary),
  total: ids.length,
  cursor,
  stats: { total: ids.length, archived: 0 },
});

/** Retries are off so a rejected request fails the assertion rather than the run. */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
};

const givenClient = () =>
  mockUseKibana.mockReturnValue({
    services: {
      notifications: { toasts: { addError: addErrorMock } },
      nightshiftInvestigations: { investigationsClient: { fetch: fetchMock } },
    },
  } as unknown as ReturnType<typeof useKibana>);

/** The `params.query` each list request was issued with, in order. */
const listQueries = () =>
  fetchMock.mock.calls
    .filter(([endpoint]) => endpoint === 'GET /internal/nightshift/memory/pages')
    .map(([, options]) => (options as { params: { query: Record<string, unknown> } }).params.query);

beforeEach(() => {
  jest.clearAllMocks();
  givenClient();
});

describe('useMemoryPages', () => {
  it('feeds the cursor the server returned into the next request', async () => {
    fetchMock
      .mockResolvedValueOnce(listResult(['memory_a', 'memory_b'], 'cursor-1'))
      .mockResolvedValueOnce(listResult(['memory_c']));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryPages('active'), { wrapper });

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    // No cursor on the first request: the server has not produced one yet.
    expect(listQueries()[0]).toEqual({ filter: 'active', size: MEMORY_PAGE_SIZE });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    expect(result.current.rows.map(({ id }) => id)).toEqual(['memory_a', 'memory_b', 'memory_c']);
    // The server's opaque token is passed straight back, not an offset.
    expect(listQueries()[1]).toEqual({
      filter: 'active',
      size: MEMORY_PAGE_SIZE,
      cursor: 'cursor-1',
    });
  });

  it('reports the server totals rather than counting the loaded rows', async () => {
    // The header numbers come from the server's whole-set aggregation. Counting the
    // loaded slice here would make them shrink as the operator pages.
    const stats = { total: 42, archived: 7 };
    fetchMock.mockResolvedValue({ ...listResult(['memory_a']), total: 42, stats });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryPages('active'), { wrapper });

    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.total).toBe(42);
    expect(result.current.stats).toEqual(stats);
  });
});

describe('useMemoryKeywordPages', () => {
  it('sends the selected keywords so the server returns the filtered set', async () => {
    fetchMock.mockResolvedValue(listResult([]));
    const { wrapper } = createWrapper();

    renderHook(() => useMemoryKeywordPages(['invoke-agent', 'cart-cache']), {
      wrapper,
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(listQueries()[0]).toEqual({
      filter: 'active',
      size: MEMORY_KEYWORD_SIZE,
      tags: ['invoke-agent', 'cart-cache'],
    });
  });

  it('follows the cursor so the ranking is not one page of the store', async () => {
    // One 200-row page would describe the newest 200 memories and silently drop
    // every older one, keywords and all.
    fetchMock
      .mockResolvedValueOnce(listResult(['memory_a'], 'cursor-1'))
      .mockResolvedValueOnce(listResult(['memory_b'], 'cursor-2'))
      .mockResolvedValueOnce(listResult(['memory_c']));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryKeywordPages(), { wrapper });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(3));
    expect(result.current.data?.pages.map(({ id }) => id)).toEqual([
      'memory_a',
      'memory_b',
      'memory_c',
    ]);
    expect(listQueries()[1]).toEqual({
      filter: 'active',
      size: MEMORY_KEYWORD_SIZE,
      cursor: 'cursor-1',
    });
    // Exhausted: no cursor on the last response, so there is no third request.
    expect(listQueries()).toHaveLength(3);
    expect(result.current.data?.capped).toBe(false);
  });

  it('stops at the cap and says the set was truncated', async () => {
    // A store larger than the cap is a real store, so the answer has to admit
    // that it ranked the newest N rather than pretend to be the whole thing.
    fetchMock.mockImplementation((_endpoint: string, options: unknown) => {
      const { cursor } = (options as { params: { query: { cursor?: string } } }).params.query;
      const page = Number(cursor?.split('-')[1] ?? '0') + 1;
      return Promise.resolve(listResult([`memory_page${page}`], `cursor-${page}`));
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryKeywordPages(), { wrapper });

    await waitFor(() =>
      expect(result.current.data?.pages).toHaveLength(MEMORY_KEYWORD_MAX_REQUESTS)
    );
    expect(listQueries()).toHaveLength(MEMORY_KEYWORD_MAX_REQUESTS);
    expect(result.current.data?.capped).toBe(true);
  });

  it('keeps two selections apart even when their terms join to the same string', async () => {
    // Tags are free text, so `a|b` and two terms `a` and `b` are different
    // filters that a joined cache key cannot tell apart.
    fetchMock.mockResolvedValue(listResult([]));
    const { wrapper } = createWrapper();

    const { rerender } = renderHook(({ tags }: { tags: string[] }) => useMemoryKeywordPages(tags), {
      wrapper,
      initialProps: { tags: ['es|ql'] },
    });
    await waitFor(() => expect(listQueries()).toHaveLength(1));

    rerender({ tags: ['es', 'ql'] });

    await waitFor(() => expect(listQueries()).toHaveLength(2));
    expect(listQueries()[1]).toEqual({
      filter: 'active',
      size: MEMORY_KEYWORD_SIZE,
      tags: ['es', 'ql'],
    });
  });
});

describe('useSetMemoryArchived', () => {
  it('archives through the route and refetches the list so the counts stay honest', async () => {
    fetchMock.mockResolvedValue(listResult(['memory_a']));
    const { wrapper } = createWrapper();
    const { result: list } = renderHook(() => useMemoryPages('active'), { wrapper });
    await waitFor(() => expect(list.current.rows).toHaveLength(1));
    const before = listQueries().length;

    const { result } = renderHook(() => useSetMemoryArchived(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'memory_a', archived: true });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'POST /internal/nightshift/memory/pages/{id}/archive',
      expect.objectContaining({ params: { path: { id: 'memory_a' }, body: { archived: true } } })
    );
    // Invalidated rather than patched: the server aggregates stats over the whole
    // filtered set, so a locally adjusted total would drift from it.
    await waitFor(() => expect(listQueries().length).toBeGreaterThan(before));
    expect(addErrorMock).not.toHaveBeenCalled();
  });
});

describe('useDeleteMemoryPage', () => {
  const version = { seq_no: 7, primary_term: 1 };

  it('deletes the reviewed revision, and refetches the list', async () => {
    fetchMock.mockResolvedValue(listResult(['memory_a']));
    const { wrapper } = createWrapper();
    const { result: list } = renderHook(() => useMemoryPages('active'), { wrapper });
    await waitFor(() => expect(list.current.rows).toHaveLength(1));
    const before = listQueries().length;

    const { result } = renderHook(() => useDeleteMemoryPage(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'memory_a', version });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'DELETE /internal/nightshift/memory/pages/{id}',
      expect.objectContaining({
        params: { path: { id: 'memory_a' }, body: { version } },
      })
    );
    await waitFor(() => expect(listQueries().length).toBeGreaterThan(before));
  });
});
