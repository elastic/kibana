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
import { useKibana } from '../../hooks/use_kibana';

jest.mock('./use_fetch_investigations', () => ({
  ...jest.requireActual('./use_fetch_investigations'),
  useFetchInvestigations: jest.fn(),
}));
jest.mock('../../hooks/use_kibana');

const mockUseFetchInvestigations = useFetchInvestigations as jest.MockedFunction<
  typeof useFetchInvestigations
>;
const mockUseKibana = useKibana as jest.Mock;
const httpGet = jest.fn();

const investigation = (id: string): InvestigationSummary => ({
  id,
  title: `${id} investigation`,
  title_pending: false,
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

const isRecentFetch = (params: FetchInvestigationsParams) =>
  params.status === 'open' && !params.inProgress && params.severities == null;

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

  it('fetches recent, in progress, then each severity tier, then the investigations without a severity', () => {
    const { result } = renderSections('checkout');

    expect(
      mockUseFetchInvestigations.mock.calls
        .slice(0, 7)
        .map(([{ inProgress, severities, status, perPage, query }]) => ({
          inProgress,
          severities,
          status,
          perPage,
          query,
        }))
    ).toEqual([
      {
        inProgress: false,
        severities: undefined,
        status: 'open',
        perPage: 20,
        query: 'checkout',
      },
      { inProgress: true, severities: undefined, status: undefined, perPage: undefined, query: 'checkout' },
      {
        inProgress: false,
        severities: ['critical'],
        status: undefined,
        perPage: undefined,
        query: 'checkout',
      },
      {
        inProgress: false,
        severities: ['high'],
        status: undefined,
        perPage: undefined,
        query: 'checkout',
      },
      {
        inProgress: false,
        severities: ['medium'],
        status: undefined,
        perPage: undefined,
        query: 'checkout',
      },
      {
        inProgress: false,
        severities: ['low'],
        status: undefined,
        perPage: undefined,
        query: 'checkout',
      },
      {
        inProgress: false,
        severities: ['none'],
        status: undefined,
        perPage: undefined,
        query: 'checkout',
      },
    ]);
    expect(result.current.sections.map(({ id }) => id)).toEqual([
      'recent',
      'in-progress',
      'critical',
      'high',
      'medium',
      'low',
      'not-rated',
    ]);
  });

  it('maps the shared severity counts onto the tiers for the tiles', async () => {
    const { result } = renderSections('checkout');

    await waitFor(() =>
      expect(result.current.severityCounts).toEqual({
        critical: 3,
        high: 1,
        medium: 0,
        low: 2,
      })
    );
    expect(httpGet).toHaveBeenCalledWith(
      '/internal/investigations/investigations/_severity_counts',
      expect.objectContaining({
        query: { in_progress: false, query: 'checkout' },
        version: '1',
      })
    );
  });

  it('leaves running investigations out of the tier counts', async () => {
    const { result } = renderSections();

    await waitFor(() => expect(result.current.severityCounts.critical).toBe(3));
    expect(httpGet).toHaveBeenCalledWith(
      '/internal/investigations/investigations/_severity_counts',
      expect.objectContaining({ query: { in_progress: false } })
    );
  });

  it('counts each matching investigation once across the sections', async () => {
    mockUseFetchInvestigations.mockImplementation((params) => {
      if (params.inProgress) {
        return sectionResult({ ids: ['running-a'] });
      }
      return params.severities?.[0] === 'none' ? sectionResult({ total: 4 }) : sectionResult();
    });

    const { result } = renderSections('checkout');

    // 1 running + 4 unrated: the tiers are empty because their sections are.
    await waitFor(() => expect(result.current.totalCount).toBe(5));
  });

  it('treats a non-empty in-progress section as active and polls recent plus in-progress', () => {
    const { result } = renderSections();

    expect(result.current.hasActiveInvestigations).toBe(true);
    expect(
      mockUseFetchInvestigations.mock.calls.slice(0, 7).map(([params]) => params.refetchInterval)
    ).toEqual([30_000, 5_000, undefined, undefined, undefined, undefined, undefined]);
  });

  it('keeps Recent overlapping other sections out of totalCount', async () => {
    const recentlyOpened = new Date().toISOString();
    mockUseFetchInvestigations.mockImplementation((params) => {
      if (isRecentFetch(params)) {
        return {
          ...sectionResult({ ids: ['just-opened'] }),
          investigations: [
            {
              ...investigation('just-opened'),
              in_progress: false,
              created_at: recentlyOpened,
              updated_at: recentlyOpened,
              metadata: { status: 'open', severity: 'high' },
            },
          ],
        };
      }
      if (params.inProgress) {
        return sectionResult({ ids: ['running-a'] });
      }
      if (params.severities?.[0] === 'high') {
        return {
          ...sectionResult({ ids: ['just-opened'], total: 1 }),
          investigations: [
            {
              ...investigation('just-opened'),
              in_progress: false,
              created_at: recentlyOpened,
              updated_at: recentlyOpened,
              metadata: { status: 'open', severity: 'high' },
            },
          ],
        };
      }
      return sectionResult();
    });

    const { result } = renderSections();

    await waitFor(() => {
      expect(result.current.sections.find((section) => section.id === 'recent')?.total).toBe(1);
      expect(result.current.sections.find((section) => section.id === 'high')?.total).toBe(1);
    });
    // Recent overlaps High: count the High item once, plus the running investigation.
    expect(result.current.totalCount).toBe(2);
  });

  it('keeps closed and stale openings out of Recently Investigated', async () => {
    const now = Date.now();
    const justOpened = new Date(now - 60_000).toISOString();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    mockUseFetchInvestigations.mockImplementation((params) => {
      if (isRecentFetch(params)) {
        return {
          ...sectionResult({ ids: ['fresh-open', 'old-open', 'closed-touch'] }),
          investigations: [
            {
              ...investigation('fresh-open'),
              in_progress: false,
              created_at: justOpened,
              updated_at: justOpened,
              metadata: { status: 'open', severity: 'high' },
            },
            {
              ...investigation('old-open'),
              in_progress: false,
              created_at: threeDaysAgo,
              updated_at: justOpened,
              metadata: { status: 'open', severity: 'medium' },
            },
            {
              ...investigation('closed-touch'),
              in_progress: false,
              created_at: justOpened,
              updated_at: justOpened,
              metadata: { status: 'closed', severity: 'critical' },
            },
          ],
        };
      }
      return sectionResult();
    });

    const { result } = renderSections();

    await waitFor(() => {
      const recent = result.current.sections.find((section) => section.id === 'recent');
      expect(recent?.investigations.map(({ id }) => id)).toEqual(['fresh-open']);
      expect(recent?.total).toBe(1);
    });
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
