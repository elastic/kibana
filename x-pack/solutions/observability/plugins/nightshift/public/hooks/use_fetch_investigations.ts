/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@kbn/react-query';
import type { HttpFetchQuery } from '@kbn/core-http-browser';
import type {
  InvestigationSeverityFilterValue,
  InvestigationSummary,
  ListInvestigationsResponse,
} from '@kbn/agentic-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import {
  MAX_SHARED_INVESTIGATIONS,
  SHARED_INVESTIGATIONS_API_VERSION,
  SHARED_INVESTIGATIONS_URL,
} from '../common/shared_investigations_api';
import { useKibana } from './use_kibana';

export const NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY = ['nightshift.investigations'] as const;

const INVESTIGATIONS_PAGE_SIZE = 10;

/**
 * The list API has no in-progress filter (`in_progress` is computed per returned page), so the
 * in-progress section reads this many of the most recently updated open investigations and keeps
 * the ones in progress. Kept small because that section polls and every read resolves the
 * workflow executions of each returned investigation.
 */
export const IN_PROGRESS_WINDOW_SIZE = 25;

/** How long a section's pages stay fresh, which bounds how often a refocus can refetch it. */
const SECTION_STALE_TIME_MS = 30_000;

export interface FetchInvestigationsParams {
  /**
   * True: only investigations an agent is working on, read from the most recently updated open
   * investigations; false: the rest. Filtered on the client, since the list API cannot.
   */
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

const toSectionQuery = ({
  inProgress,
  severities,
  query,
  page,
}: Pick<FetchInvestigationsParams, 'inProgress' | 'severities' | 'query'> & {
  page: number;
}): HttpFetchQuery => ({
  ...(inProgress
    ? {
        sort_field: 'updated_at',
        sort_order: 'desc',
        page: 1,
        per_page: IN_PROGRESS_WINDOW_SIZE,
        status: ['open'],
      }
    : {
        sort_field: 'created_at',
        sort_order: 'desc',
        page,
        per_page: INVESTIGATIONS_PAGE_SIZE,
        ...(severities?.length ? { severity: severities } : {}),
      }),
  ...(query ? { query } : {}),
});

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
        query: toSectionQuery({
          inProgress,
          severities,
          query,
          page: typeof pageParam === 'number' ? pageParam : 1,
        }),
        signal,
      }),
    // The in-progress section is a single window, never paged.
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

  const loadedInvestigations = useMemo(
    () => flattenInvestigationPages(data?.pages ?? []),
    [data?.pages]
  );

  const investigations = useMemo(
    () =>
      loadedInvestigations.filter(({ in_progress: isInProgress }) => isInProgress === inProgress),
    [loadedInvestigations, inProgress]
  );

  const serverTotal = data?.pages[data.pages.length - 1]?.pagination.total ?? 0;
  // The server total counts the investigations filtered out above; drop the loaded ones from it.
  const total = inProgress
    ? investigations.length
    : serverTotal - (loadedInvestigations.length - investigations.length);

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
