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
import { useFetchInvestigations, type FetchInvestigationsParams } from './use_fetch_investigations';
import { useInvestigationSections } from './use_investigation_sections';
import { useKibana } from './use_kibana';

jest.mock('./use_fetch_investigations', () => ({
  ...jest.requireActual('./use_fetch_investigations'),
  useFetchInvestigations: jest.fn(),
}));
jest.mock('./use_kibana');

const mockUseFetchInvestigations = useFetchInvestigations as jest.MockedFunction<
  typeof useFetchInvestigations
>;
const mockUseKibana = useKibana as jest.Mock;
const httpGet = jest.fn();

const investigation = (id: string): InvestigationSummary => ({
  id,
  title: `${id} investigation`,
  created_at: '2026-09-11T09:00:00.000Z',
  updated_at: '2026-09-11T09:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open' },
  in_progress: true,
  subjects: [],
});

const sectionResult = ({
  ids = [],
  total = ids.length,
  isPreviousData = false,
  refetch = jest.fn(),
}: {
  ids?: string[];
  total?: number;
  isPreviousData?: boolean;
  refetch?: jest.Mock;
} = {}) => ({
  investigations: ids.map(investigation),
  total,
  hasMore: false,
  isInitialLoading: false,
  isFetchingNextPage: false,
  isFetching: false,
  isPreviousData,
  error: null,
  fetchNextPage: jest.fn(),
  refetch,
});

const isCritical = ({ severities }: FetchInvestigationsParams) => severities?.[0] === 'critical';

const withInProgress =
  ({
    ids,
    isPreviousData,
    refetchCritical,
  }: {
    ids: string[];
    isPreviousData?: boolean;
    refetchCritical: jest.Mock;
  }) =>
  (params: FetchInvestigationsParams) => {
    if (params.inProgress) {
      return sectionResult({ ids, isPreviousData });
    }
    if (isCritical(params)) {
      return sectionResult({ total: 3, refetch: refetchCritical });
    }
    return sectionResult();
  };

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const renderSections = (query?: string) =>
  renderHook((props: { query?: string }) => useInvestigationSections(props), {
    initialProps: { query },
    wrapper: createWrapper(),
  });

describe('useInvestigationSections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    httpGet.mockResolvedValue({ critical: 3, high: 1, medium: 0, low: 2 });
    mockUseKibana.mockReturnValue({
      services: { http: { get: httpGet }, agenticInvestigations: {} },
    });
    mockUseFetchInvestigations.mockImplementation((params) =>
      params.inProgress ? sectionResult({ ids: ['running-a', 'running-b'] }) : sectionResult()
    );
  });

  it('fetches in progress, then each severity tier, then the investigations without a severity', () => {
    const { result } = renderSections('checkout');

    expect(
      mockUseFetchInvestigations.mock.calls
        .slice(0, 6)
        .map(([{ inProgress, severities, query }]) => ({ inProgress, severities, query }))
    ).toEqual([
      { inProgress: true, severities: undefined, query: 'checkout' },
      { inProgress: false, severities: ['critical'], query: 'checkout' },
      { inProgress: false, severities: ['high'], query: 'checkout' },
      { inProgress: false, severities: ['medium'], query: 'checkout' },
      { inProgress: false, severities: ['low'], query: 'checkout' },
      { inProgress: false, severities: ['none'], query: 'checkout' },
    ]);
    expect(result.current.sections.map(({ id }) => id)).toEqual([
      'in-progress',
      '80-critical',
      '60-high',
      '40-medium',
      '20-low',
      'not-rated',
    ]);
  });

  it('maps the shared severity counts onto the tiers for the tiles', async () => {
    const { result } = renderSections('checkout');

    await waitFor(() =>
      expect(result.current.severityCounts).toEqual({
        '80-critical': 3,
        '60-high': 1,
        '40-medium': 0,
        '20-low': 2,
      })
    );
    expect(httpGet).toHaveBeenCalledWith(
      '/internal/investigations/investigations/_severity_counts',
      expect.objectContaining({ query: { in_progress: false, query: 'checkout' }, version: '1' })
    );
  });

  it('treats a non-empty in-progress section as active and polls only that section', () => {
    const { result } = renderSections();

    expect(result.current.hasActiveInvestigations).toBe(true);
    expect(
      mockUseFetchInvestigations.mock.calls.slice(0, 6).map(([params]) => params.refetchInterval)
    ).toEqual([5_000, undefined, undefined, undefined, undefined, undefined]);
  });

  it('refetches the other sections when work leaves the in-progress section', () => {
    const refetchCritical = jest.fn();
    mockUseFetchInvestigations.mockImplementation(
      withInProgress({ ids: ['running-a', 'running-b'], refetchCritical })
    );
    const { rerender } = renderSections();
    expect(refetchCritical).not.toHaveBeenCalled();

    // One finished as another started: the total stays flat, but an id left.
    mockUseFetchInvestigations.mockImplementation(
      withInProgress({ ids: ['running-b', 'running-c'], refetchCritical })
    );
    rerender({ query: undefined });

    expect(refetchCritical).toHaveBeenCalledTimes(1);
  });

  it('does not refetch when new work starts or the search changes', () => {
    const refetchCritical = jest.fn();
    mockUseFetchInvestigations.mockImplementation(
      withInProgress({ ids: ['running-a'], refetchCritical })
    );
    const { rerender } = renderSections('checkout');

    mockUseFetchInvestigations.mockImplementation(
      withInProgress({ ids: ['running-a', 'running-b'], refetchCritical })
    );
    rerender({ query: 'checkout' });
    mockUseFetchInvestigations.mockImplementation(
      withInProgress({ ids: ['running-c'], refetchCritical })
    );
    rerender({ query: 'checkout errors' });

    expect(refetchCritical).not.toHaveBeenCalled();
  });
});
