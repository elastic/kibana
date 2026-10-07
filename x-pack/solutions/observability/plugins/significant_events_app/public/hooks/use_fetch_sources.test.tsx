/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MAX_SOURCES_PER_PAGE, type NightshiftSource } from '@kbn/nightshift-shared';
import { useFetchSources } from './use_fetch_sources';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const makeSource = (id: string): NightshiftSource => ({
  id,
  title: id,
  tags: [],
  esql: 'FROM logs-*',
  type: 'logs',
  slug: id,
  view_name: `$.nightshift.sources.default.${id}`,
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
});

const makePage = (from: number, count: number) =>
  Array.from({ length: count }, (_, index) => makeSource(`source-${from + index}`));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useFetchSources', () => {
  const fetch = jest.fn();

  beforeEach(() => {
    fetch.mockReset();
    mockUseKibana.mockReturnValue({
      core: { notifications: { toasts: { addError: jest.fn() } } },
      dependencies: {
        start: { nightshiftSources: { getClient: jest.fn().mockResolvedValue({ fetch }) } },
      },
    } as never);
  });

  it('reads pages until it has every source of the space', async () => {
    const total = MAX_SOURCES_PER_PAGE + 20;
    fetch
      .mockResolvedValueOnce({ sources: makePage(0, MAX_SOURCES_PER_PAGE), total })
      .mockResolvedValueOnce({ sources: makePage(MAX_SOURCES_PER_PAGE, 20), total });

    const { result } = renderHook(() => useFetchSources(), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(total));
    expect(fetch.mock.calls.map(([, { params }]) => params.query)).toEqual([
      { page: 1, per_page: MAX_SOURCES_PER_PAGE },
      { page: 2, per_page: MAX_SOURCES_PER_PAGE },
    ]);
  });

  it('stops after one request when the first page holds every source', async () => {
    fetch.mockResolvedValueOnce({ sources: makePage(0, 3), total: 3 });

    const { result } = renderHook(() => useFetchSources(), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(3));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('stops on a full last page when the total is a multiple of the page size', async () => {
    fetch.mockResolvedValueOnce({
      sources: makePage(0, MAX_SOURCES_PER_PAGE),
      total: MAX_SOURCES_PER_PAGE,
    });

    const { result } = renderHook(() => useFetchSources(), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(MAX_SOURCES_PER_PAGE));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('toasts once when several callers see the same failed fetch', async () => {
    const addError = jest.fn();
    mockUseKibana.mockReturnValue({
      core: { notifications: { toasts: { addError } } },
      dependencies: {
        start: { nightshiftSources: { getClient: jest.fn().mockResolvedValue({ fetch }) } },
      },
    } as never);
    fetch.mockRejectedValue(new Error('sources unavailable'));

    const { result } = renderHook(() => [useFetchSources(), useFetchSources()], { wrapper });

    await waitFor(() => expect(result.current[0].isError).toBe(true));
    expect(result.current[1].isError).toBe(true);
    expect(addError).toHaveBeenCalledTimes(1);
  });
});
