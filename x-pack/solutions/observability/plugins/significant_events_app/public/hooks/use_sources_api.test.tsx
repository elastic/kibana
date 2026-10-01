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

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSourcesApi(), { wrapper });
  return { result, invalidateQueries };
};

describe('useSourcesApi knowledge invalidation', () => {
  beforeEach(() => {
    const fetch = jest.fn().mockResolvedValue({});
    mockUseKibana.mockReturnValue({
      core: { notifications: { toasts: { addError: jest.fn(), addSuccess: jest.fn() } } },
      dependencies: {
        start: {
          nightshiftSources: { getClient: jest.fn().mockResolvedValue({ fetch }) },
        },
      },
    } as never);
  });

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
});
