/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../../../../hooks/use_kibana';
import {
  MEMORY_KEYWORD_SIZE,
  MEMORY_PAGE_SIZE,
  useDeleteMemoryPage,
  useMemoryEnabled,
  useMemoryKeywordPages,
  useMemoryPage,
  useMemoryPages,
  useSetMemoryArchived,
} from './use_memory';
import type { MemoryListResult } from './types';

jest.mock('../../../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const fetchMock = jest.fn();

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
    dependencies: {
      start: { nightshiftInvestigations: { investigationsClient: { fetch: fetchMock } } },
    },
  } as unknown as ReturnType<typeof useKibana>);

const givenNoClient = () =>
  mockUseKibana.mockReturnValue({
    dependencies: { start: {} },
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

  it('stops paging when the server omits the cursor', async () => {
    fetchMock.mockResolvedValue(listResult(['memory_a', 'memory_b']));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryPages('all'), { wrapper });

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    // A full page might still be the last, so the only proof the set is exhausted
    // is the absent cursor.
    expect(result.current.hasNextPage).toBe(false);
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

  it('is disabled, and issues no request, when the client is absent', async () => {
    givenNoClient();
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryPages('active'), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useMemoryKeywordPages', () => {
  it('asks the list route for the widest page of live memories', async () => {
    // The tab's own list is a 25-row slice, which would describe a quarter of
    // the store; the chart asks for its own wider page rather than a new route.
    fetchMock.mockResolvedValue(listResult(['memory_a']));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryKeywordPages(), { wrapper });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
    expect(listQueries()[0]).toEqual({ filter: 'active', size: MEMORY_KEYWORD_SIZE });
  });

  it('sends the selected keywords so the server returns the filtered set', async () => {
    fetchMock.mockResolvedValue(listResult([]));
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useMemoryKeywordPages(['invoke-agent', 'invoke_agent', 'cart cache']),
      { wrapper }
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(listQueries()[0]).toEqual({
      filter: 'active',
      size: MEMORY_KEYWORD_SIZE,
      // Every spelling of every selected keyword travels, so a document written
      // before tags were canonicalized still matches.
      tags: ['invoke-agent', 'invoke_agent', 'cart cache'],
    });
  });

  it('refetches when the selection changes, rather than reusing the stale set', async () => {
    fetchMock.mockResolvedValue(listResult([]));
    const { wrapper } = createWrapper();

    const { rerender } = renderHook(({ tags }: { tags: string[] }) => useMemoryKeywordPages(tags), {
      wrapper,
      initialProps: { tags: [] as string[] },
    });
    await waitFor(() => expect(listQueries()).toHaveLength(1));

    rerender({ tags: ['kafka'] });

    await waitFor(() => expect(listQueries()).toHaveLength(2));
    expect(listQueries()[1]).toEqual({
      filter: 'active',
      size: MEMORY_KEYWORD_SIZE,
      tags: ['kafka'],
    });
  });

  it('stays disabled, and issues no request, when the client is absent', async () => {
    givenNoClient();
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryKeywordPages(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useMemoryPage', () => {
  it('is disabled until an id is selected', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryPage(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches the page by id once one is selected', async () => {
    fetchMock.mockResolvedValue({ page: summary('memory_a'), usefulness: 0.5, confidence: 0.8 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryPage('memory_a'), { wrapper });

    await waitFor(() => expect(result.current.data?.page.id).toBe('memory_a'));
    expect(fetchMock).toHaveBeenCalledWith(
      'GET /internal/nightshift/memory/pages/{id}',
      expect.objectContaining({ params: { path: { id: 'memory_a' } } })
    );
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
      await result.current('memory_a', true);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'POST /internal/nightshift/memory/pages/{id}/archive',
      expect.objectContaining({ params: { path: { id: 'memory_a' }, body: { archived: true } } })
    );
    // Invalidated rather than patched: the server aggregates stats over the whole
    // filtered set, so a locally adjusted total would drift from it.
    await waitFor(() => expect(listQueries().length).toBeGreaterThan(before));
  });
});

describe('useDeleteMemoryPage', () => {
  it('deletes with the confirmed title and refetches the list', async () => {
    fetchMock.mockResolvedValue(listResult(['memory_a']));
    const { wrapper } = createWrapper();
    const { result: list } = renderHook(() => useMemoryPages('active'), { wrapper });
    await waitFor(() => expect(list.current.rows).toHaveLength(1));
    const before = listQueries().length;

    const { result } = renderHook(() => useDeleteMemoryPage(), { wrapper });
    await act(async () => {
      await result.current('memory_a', 'Memory memory_a');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'DELETE /internal/nightshift/memory/pages/{id}',
      expect.objectContaining({
        params: { path: { id: 'memory_a' }, body: { confirm_title: 'Memory memory_a' } },
      })
    );
    await waitFor(() => expect(listQueries().length).toBeGreaterThan(before));
  });

  it('propagates a rejected delete rather than reporting a success', async () => {
    fetchMock.mockRejectedValue(new Error('version conflict'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteMemoryPage(), { wrapper });
    await act(async () => {
      await expect(result.current('memory_a', 'Memory memory_a')).rejects.toThrow(
        'version conflict'
      );
    });
    // A failed write must not invalidate anything: there is nothing to refetch.
    expect(listQueries()).toHaveLength(0);
  });
});

describe('useMemoryEnabled', () => {
  it('reports the flag so the tab can be hidden when the plugin is off', async () => {
    fetchMock.mockResolvedValue({ enabled: false });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryEnabled(), { wrapper });

    await waitFor(() => expect(result.current).toEqual({ isEnabled: false, isLoading: false }));
  });

  it('stays disabled, and issues no request, when the client is absent', async () => {
    givenNoClient();
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryEnabled(), { wrapper });

    await waitFor(() => expect(result.current).toEqual({ isEnabled: false, isLoading: false }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // The loading state is the whole reason this hook returns more than a boolean: a
  // page that cannot tell "off" from "not known yet" redirects a tab that is about
  // to appear. It must be loading first and settled after, whatever the flag says.
  it('separates "off" from "not answered yet" while the query is in flight', async () => {
    let resolveFetch: (value: { enabled: boolean }) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise<{ enabled: boolean }>((resolve) => {
        resolveFetch = resolve;
      })
    );
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemoryEnabled(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.isEnabled).toBe(false);

    resolveFetch({ enabled: true });
    await waitFor(() => expect(result.current).toEqual({ isEnabled: true, isLoading: false }));
  });
});
