/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@kbn/react-query';
import type {
  InvestigationStatus,
  ListInvestigationItem,
  ListInvestigationsResponse,
  Severity,
} from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from './use_kibana';

const NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY = ['nightshift.investigations'] as const;

const INVESTIGATIONS_PAGE_SIZE = 10;

/** How long a section's pages stay fresh, which bounds how often a refocus can refetch it. */
const SECTION_STALE_TIME_MS = 30_000;

export interface FetchInvestigationsParams {
  statuses: InvestigationStatus[];
  severities?: Severity[];
  query?: string;
  /**
   * Poll interval in ms, or `false` to never poll. A refetch re-requests every page this
   * section has loaded, so only sections that stay shallow should poll.
   */
  refetchInterval?: number | false;
}

export interface FetchInvestigationsResult {
  investigations: ListInvestigationItem[];
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
const flattenInvestigationPages = (
  pages: ListInvestigationsResponse[]
): ListInvestigationItem[] => {
  const seen = new Set<string>();
  const items: ListInvestigationItem[] = [];

  for (const page of pages) {
    for (const item of page.results) {
      if (seen.has(item.investigation_id)) {
        continue;
      }
      seen.add(item.investigation_id);
      items.push(item);
    }
  }

  return items;
};

export const MAX_INVESTIGATIONS_PAGE = 100;

export const getInvestigationsNextPageParam = (
  lastPage: ListInvestigationsResponse
): number | undefined =>
  lastPage.page < MAX_INVESTIGATIONS_PAGE && lastPage.page * lastPage.size < lastPage.total
    ? lastPage.page + 1
    : undefined;

export const useFetchInvestigations = ({
  statuses,
  severities,
  query,
  refetchInterval = false,
}: FetchInvestigationsParams): FetchInvestigationsResult => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

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
    queryKey: [...NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY, 'section', statuses, severities, query],
    // investigationsClient is undefined when the plugin is unavailable (optional dep)
    enabled: investigationsClient != null,
    queryFn: async ({ pageParam, signal }) => {
      if (!investigationsClient) {
        // enabled guards this at runtime; TS cannot see that from inside the closure
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      const page = typeof pageParam === 'number' ? pageParam : 1;
      return investigationsClient.fetch('GET /internal/nightshift/investigations', {
        params: {
          query: {
            sort_field: 'created_at',
            sort_order: 'desc',
            page,
            size: INVESTIGATIONS_PAGE_SIZE,
            statuses,
            ...(severities?.length ? { severities } : {}),
            ...(query ? { query } : {}),
          },
        },
        signal: signal ?? null,
      });
    },
    getNextPageParam: getInvestigationsNextPageParam,
    refetchInterval,
    staleTime: SECTION_STALE_TIME_MS,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
    // Deviates from the app's convention of not setting `retry`. Without this, an
    // unavailable-API 404 leaves the homepage spinning for ~7s (v4 default: 3 retries
    // with exponential backoff). 4xx errors are permanent; retry only on network/5xx.
    retry: (failureCount, err) => !isHttpClientError(err) && failureCount < 3,
  });

  const investigations = useMemo(() => flattenInvestigationPages(data?.pages ?? []), [data?.pages]);

  const total = data?.pages[data.pages.length - 1]?.total ?? 0;

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
