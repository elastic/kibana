/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@kbn/react-query';
import type {
  InvestigationSeverityFilterValue,
  InvestigationSummary,
  ListInvestigationsResponse,
} from '@kbn/agentic-investigations-plugin/common';
import { isHttpClientError } from '../../common/http_error';
import {
  MAX_SHARED_INVESTIGATIONS,
  SHARED_INVESTIGATIONS_API_VERSION,
  SHARED_INVESTIGATIONS_URL,
} from './shared_investigations_api';
import { useKibana } from '../../hooks/use_kibana';

export const NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY = ['nightshift.investigations'] as const;

const INVESTIGATIONS_PAGE_SIZE = 10;

/**
 * The shared list API cannot filter on `in_progress`, so the in-progress section reads this many
 * of the newest open investigations and keeps the running ones.
 */
const IN_PROGRESS_CANDIDATES = 20;

/** How long a section's pages stay fresh, which bounds how often a refocus can refetch it. */
const SECTION_STALE_TIME_MS = 30_000;

export interface FetchInvestigationsParams {
  /** True: only investigations an agent is working on; false: the rest. */
  inProgress: boolean;
  severities?: InvestigationSeverityFilterValue[];
  query?: string;
  /**
   * Poll interval in ms, or `false` to never poll. A refetch re-requests every page this
   * section has loaded, so only sections that stay shallow should poll.
   */
  refetchInterval?: number | false;
}

export interface FetchInvestigationsResult {
  investigations: InvestigationSummary[];
  total: number;
  hasMore: boolean;
  isInitialLoading: boolean;
  isFetchingNextPage: boolean;
  isFetching: boolean;
  isPreviousData: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  refetch: () => void;
}

/** Offset pages over a live `created_at desc` window can repeat an id across boundaries. */
const flattenInvestigationPages = (pages: ListInvestigationsResponse[]): InvestigationSummary[] => {
  const seen = new Set<string>();
  const items: InvestigationSummary[] = [];

  for (const page of pages) {
    for (const item of page.results) {
      if (seen.has(item.id)) {
        continue;
      }
      seen.add(item.id);
      items.push(item);
    }
  }

  return items;
};

export const getInvestigationsNextPageParam = ({
  pagination: { page, per_page: perPage, total },
}: ListInvestigationsResponse): number | undefined => {
  const loaded = page * perPage;
  return loaded < total && loaded + perPage <= MAX_SHARED_INVESTIGATIONS ? page + 1 : undefined;
};

/** One landing section's investigations from the shared investigations list API, page by page. */
export const useFetchInvestigations = ({
  inProgress,
  severities,
  query,
  refetchInterval = false,
}: FetchInvestigationsParams): FetchInvestigationsResult => {
  const { http, agenticInvestigations } = useKibana().services;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isInitialLoading,
    isPreviousData,
    refetch,
  } = useInfiniteQuery<ListInvestigationsResponse, Error>({
    queryKey: [...NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY, 'section', inProgress, severities, query],
    // The list API belongs to agenticInvestigations, an optional dependency.
    enabled: agenticInvestigations != null,
    queryFn: async ({ pageParam, signal }) =>
      http.get<ListInvestigationsResponse>(SHARED_INVESTIGATIONS_URL, {
        version: SHARED_INVESTIGATIONS_API_VERSION,
        query: {
          sort_field: 'created_at',
          sort_order: 'desc',
          ...(inProgress
            ? { page: 1, per_page: IN_PROGRESS_CANDIDATES, status: 'open' }
            : {
                page: typeof pageParam === 'number' ? pageParam : 1,
                per_page: INVESTIGATIONS_PAGE_SIZE,
              }),
          ...(severities?.length ? { severity: severities } : {}),
          ...(query ? { query } : {}),
        },
        signal,
      }),
    getNextPageParam: inProgress ? () => undefined : getInvestigationsNextPageParam,
    refetchInterval,
    staleTime: SECTION_STALE_TIME_MS,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
    // Deviates from the app's convention of not setting `retry`. Without this, an
    // unavailable-API 404 leaves the homepage spinning for ~7s (v4 default: 3 retries
    // with exponential backoff). 4xx errors are permanent; retry only on network/5xx.
    retry: (failureCount, err) => !isHttpClientError(err) && failureCount < 3,
  });

  // The other sections keep running investigations: dropping them from a page could empty the
  // section and hide the finished ones on later pages.
  const investigations = useMemo(() => {
    const loaded = flattenInvestigationPages(data?.pages ?? []);
    return inProgress ? loaded.filter(({ in_progress: isRunning }) => isRunning) : loaded;
  }, [data?.pages, inProgress]);

  const listedTotal = data?.pages[data.pages.length - 1]?.pagination.total ?? 0;
  const total = inProgress ? investigations.length : listedTotal;

  const handleFetchNextPage = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  return useMemo(
    () => ({
      investigations,
      total,
      hasMore: hasNextPage ?? false,
      isInitialLoading,
      isFetchingNextPage,
      isFetching,
      isPreviousData,
      error: error ?? null,
      fetchNextPage: handleFetchNextPage,
      refetch: handleRefetch,
    }),
    [
      investigations,
      total,
      hasNextPage,
      isInitialLoading,
      isFetchingNextPage,
      isFetching,
      isPreviousData,
      error,
      handleFetchNextPage,
      handleRefetch,
    ]
  );
};
