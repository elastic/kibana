/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { DISCOVERY_QUERIES_QUERY_KEY } from './use_fetch_discovery_queries';
import { DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY } from './use_fetch_discovery_queries_occurrences';
import { SOURCES_QUERY_KEY } from './use_fetch_sources';
import { useKibana } from './use_kibana';
import { useSourcesApi } from './use_sources_api';

jest.mock('./use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const nginxSource: NightshiftSource = {
  id: 'source-1',
  title: 'Nginx errors',
  tags: [],
  esql: 'FROM logs-nginx-*',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.default.nginx-errors',
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
};

const KNOWLEDGE_PREFIXES = [
  ['features'],
  [...DISCOVERY_QUERIES_QUERY_KEY],
  [...DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY],
  ['queryOccurrenceStats'],
];

const UPDATE_BODY = {
  title: 'Nginx errors',
  tags: [],
  esql: 'FROM logs-nginx-* | WHERE status >= 500',
};

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
  const fetch = jest.fn().mockResolvedValue({ source: nginxSource });
  mockUseKibana.mockReturnValue({
    core: { notifications: { toasts: { addError: jest.fn(), addSuccess: jest.fn() } } },
    dependencies: {
      start: { nightshiftSources: { getClient: jest.fn().mockResolvedValue({ fetch }) } },
    },
  } as never);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSourcesApi(), { wrapper });
  return { result, invalidateQueries, fetch };
};

describe('useSourcesApi requests', () => {
  it('creates a source with POST on the sources collection', async () => {
    const { result, fetch } = setup();

    act(() => result.current.createSource.mutate({ ...UPDATE_BODY, title: 'New source' }));

    await waitFor(() => expect(result.current.createSource.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith('POST /internal/nightshift/sources', {
      params: { body: { ...UPDATE_BODY, title: 'New source' } },
      signal: null,
    });
  });

  it('updates a source with PUT on its id', async () => {
    const { result, fetch } = setup();

    act(() => result.current.updateSource.mutate({ sourceId: 'source-1', body: UPDATE_BODY }));

    await waitFor(() => expect(result.current.updateSource.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith('PUT /internal/nightshift/sources/{sourceId}', {
      params: { path: { sourceId: 'source-1' }, body: UPDATE_BODY },
      signal: null,
    });
  });

  it.each([
    [true, 'POST /internal/nightshift/sources/{sourceId}/_enable'],
    [false, 'POST /internal/nightshift/sources/{sourceId}/_disable'],
  ])('sends enabled=%s to %s', async (enabled, endpoint) => {
    const { result, fetch } = setup();

    act(() => result.current.setSourceEnabled.mutate({ sourceId: 'source-1', enabled }));

    await waitFor(() => expect(result.current.setSourceEnabled.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(endpoint, {
      params: { path: { sourceId: 'source-1' } },
      signal: null,
    });
  });

  it('deletes a source with DELETE on its id', async () => {
    const { result, fetch } = setup();

    act(() => result.current.deleteSource.mutate(nginxSource));

    await waitFor(() => expect(result.current.deleteSource.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith('DELETE /internal/nightshift/sources/{sourceId}', {
      params: { path: { sourceId: 'source-1' } },
      signal: null,
    });
  });
});

describe('useSourcesApi knowledge invalidation', () => {
  it('does not refetch the knowledge of a deleted source', async () => {
    const { result, invalidateQueries } = setup();

    act(() => result.current.deleteSource.mutate(nginxSource));

    await waitFor(() => expect(result.current.deleteSource.isSuccess).toBe(true));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: SOURCES_QUERY_KEY });
    for (const queryKey of KNOWLEDGE_PREFIXES) {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey, refetchType: 'none' });
      expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: [...queryKey, 'source-1'] });
    }
  });

  it('refetches mounted knowledge after an update, which can change the query', async () => {
    const { result, invalidateQueries } = setup();

    act(() => result.current.updateSource.mutate({ sourceId: 'source-1', body: UPDATE_BODY }));

    await waitFor(() => expect(result.current.updateSource.isSuccess).toBe(true));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: SOURCES_QUERY_KEY });
    for (const queryKey of KNOWLEDGE_PREFIXES) {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey, refetchType: 'active' });
    }
  });

  it('marks knowledge stale after enabling or disabling, which flips the rules', async () => {
    const { result, invalidateQueries } = setup();

    act(() => result.current.setSourceEnabled.mutate({ sourceId: 'source-1', enabled: false }));

    await waitFor(() => expect(result.current.setSourceEnabled.isSuccess).toBe(true));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: SOURCES_QUERY_KEY });
    for (const queryKey of KNOWLEDGE_PREFIXES) {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey, refetchType: 'none' });
    }
  });

  it('leaves knowledge alone after a create, since a new source has none', async () => {
    const { result, invalidateQueries } = setup();

    act(() => result.current.createSource.mutate(UPDATE_BODY));

    await waitFor(() => expect(result.current.createSource.isSuccess).toBe(true));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: SOURCES_QUERY_KEY });
    for (const queryKey of KNOWLEDGE_PREFIXES) {
      expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey, refetchType: 'none' });
    }
  });
});
