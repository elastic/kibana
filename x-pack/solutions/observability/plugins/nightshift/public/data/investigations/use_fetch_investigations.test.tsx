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
      results: [investigation('running', true), investigation('done', false)],
      pagination: { page: 1, per_page: 10, total: 12 },
    });
  });

  it('keeps only the running investigations among the newest open ones', async () => {
    const { result } = renderHook(() => useFetchInvestigations({ inProgress: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.investigations.map(({ id }) => id)).toEqual(['running'])
    );
    expect(result.current.total).toBe(1);
    expect(result.current.hasMore).toBe(false);
    expect(httpGet).toHaveBeenCalledWith(
      '/internal/investigations/investigations',
      expect.objectContaining({
        query: {
          sort_field: 'created_at',
          sort_order: 'desc',
          page: 1,
          per_page: 20,
          status: 'open',
        },
      })
    );
  });

  it('keeps running investigations in the other sections, so none becomes unreachable', async () => {
    const { result } = renderHook(
      () => useFetchInvestigations({ inProgress: false, severities: ['high'] }),
      { wrapper: createWrapper() }
    );

    await waitFor(() =>
      expect(result.current.investigations.map(({ id }) => id)).toEqual(['running', 'done'])
    );
    expect(result.current.total).toBe(12);
    expect(httpGet).toHaveBeenCalledWith(
      '/internal/investigations/investigations',
      expect.objectContaining({
        query: {
          sort_field: 'created_at',
          sort_order: 'desc',
          page: 1,
          per_page: 10,
          severity: ['high'],
        },
      })
    );
  });
});
