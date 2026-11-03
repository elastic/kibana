/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { getInvestigationsNextPageParam, useFetchInvestigations } from './use_fetch_investigations';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const httpGet = jest.fn();

const page = (pageNumber: number, total: number) => ({
  results: [],
  pagination: { page: pageNumber, per_page: 10, total },
});

const investigation = (id: string, inProgress: boolean): InvestigationSummary => ({
  id,
  title: `${id} investigation`,
  title_pending: false,
  created_at: '2026-09-11T09:00:00.000Z',
  updated_at: '2026-09-11T09:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open' },
  in_progress: inProgress,
  subjects: [],
});

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('getInvestigationsNextPageParam', () => {
  it('asks for the next page while the list has more', () => {
    expect(getInvestigationsNextPageParam(page(1, 25))).toBe(2);
    expect(getInvestigationsNextPageParam(page(3, 25))).toBeUndefined();
  });

  it('stops at the furthest page the shared list API reaches', () => {
    expect(getInvestigationsNextPageParam(page(99, 1000))).toBe(100);
    expect(getInvestigationsNextPageParam(page(100, 1000))).toBeUndefined();
  });
});

describe('useFetchInvestigations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: { http: { get: httpGet }, agenticInvestigations: {} },
    });
    httpGet.mockResolvedValue({
      results: [investigation('running', true), investigation('also-running', true)],
      pagination: { page: 1, per_page: 10, total: 12 },
    });
  });

  it('asks only for the running investigations in the in-progress section', async () => {
    const { result } = renderHook(() => useFetchInvestigations({ inProgress: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.investigations.map(({ id }) => id)).toEqual(['running', 'also-running'])
    );
    expect(result.current.total).toBe(2);
    expect(result.current.hasMore).toBe(false);
    expect(httpGet).toHaveBeenCalledWith(
      '/internal/investigations/investigations',
      expect.objectContaining({
        query: {
          sort_field: 'created_at',
          sort_order: 'desc',
          in_progress: true,
          page: 1,
          per_page: 20,
        },
      })
    );
  });

  it('asks the other sections for finished investigations only', async () => {
    httpGet.mockResolvedValue({
      results: [investigation('done', false), investigation('also-done', false)],
      pagination: { page: 1, per_page: 10, total: 12 },
    });
    const { result } = renderHook(
      () => useFetchInvestigations({ inProgress: false, severities: ['high'] }),
      { wrapper: createWrapper() }
    );

    await waitFor(() =>
      expect(result.current.investigations.map(({ id }) => id)).toEqual(['done', 'also-done'])
    );
    expect(result.current.total).toBe(12);
    expect(httpGet).toHaveBeenCalledWith(
      '/internal/investigations/investigations',
      expect.objectContaining({
        query: {
          sort_field: 'created_at',
          sort_order: 'desc',
          in_progress: false,
          page: 1,
          per_page: 10,
          severity: ['high'],
        },
      })
    );
  });
});
