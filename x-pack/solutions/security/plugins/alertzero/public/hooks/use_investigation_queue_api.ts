/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { UseInfiniteQueryResult, UseQueryResult } from '@kbn/react-query';
import { useInfiniteQuery, useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  ALERTZERO_INVESTIGATIONS_CATEGORY_URL,
  ALERTZERO_INVESTIGATIONS_CLOSED_URL,
} from '@kbn/alertzero-common';
import { retryOnTransientError } from './retry_on_transient_error';
import type { InvestigationsPageResponse } from '../../common/investigations/queue';
import { MAX_QUEUE_REACH } from '../../common/investigations/queue';
import { queryKeys } from '../query_keys';

/**
 * Workers add proposals, and analysts close investigations, on their own cadence, so the queue polls. React Query does
 * not poll a disabled query, so a collapsed section refreshes only its count.
 */
export const QUEUE_POLL_INTERVAL_MS = 60_000;

const categoryPath = (category: string) =>
  ALERTZERO_INVESTIGATIONS_CATEGORY_URL.replace('{category}', encodeURIComponent(category));

interface PagesOptions {
  firstPageSize: number;
  step: number;
  enabled: boolean;
}

/**
 * The accumulated row count rather than `pages.length * size`, which is what lets
 * the first page be a different size. `undefined` ends the paging.
 */
const nextOffset = (lastPage: InvestigationsPageResponse, pages: InvestigationsPageResponse[]) => {
  const loaded = pages.reduce((count, page) => count + page.investigations.length, 0);
  return loaded >= lastPage.total || loaded >= MAX_QUEUE_REACH ? undefined : loaded;
};

/**
 * `size: 0` — the bucket's total with none of its rows. Only worth its own request
 * while the rows are not loaded: a page response carries the same total.
 */
const useQueueCount = (
  queryKey: readonly unknown[],
  path: string,
  enabled: boolean
): UseQueryResult<InvestigationsPageResponse> => {
  const { services } = useKibana();

  return useQuery({
    queryKey,
    queryFn: async (): Promise<InvestigationsPageResponse> =>
      services.http!.get<InvestigationsPageResponse>(path, {
        version: API_VERSIONS.internal.v1,
        query: { size: 0, from: 0 },
      }),
    enabled,
    refetchInterval: QUEUE_POLL_INTERVAL_MS,
    retry: retryOnTransientError,
  });
};

/** Only the newest window moves on its own; the rest is history the analyst paged into. */
const isLeadingPage = (_page: InvestigationsPageResponse, index: number) => index === 0;

const useQueuePages = (
  queryKey: readonly unknown[],
  path: string,
  { firstPageSize, step, enabled }: PagesOptions
): UseInfiniteQueryResult<InvestigationsPageResponse> => {
  const { services } = useKibana();

  const query = useInfiniteQuery({
    queryKey,
    // React Query v4 calls the first page with `pageParam: undefined`.
    queryFn: async ({ pageParam }: { pageParam?: number }): Promise<InvestigationsPageResponse> => {
      const from = pageParam ?? 0;
      // Shrunk on the last page: the route refuses `from + size` past the reach, so
      // a full step near the ceiling would 400 instead of returning the rows left.
      const size = Math.min(from === 0 ? firstPageSize : step, MAX_QUEUE_REACH - from);
      return services.http!.get<InvestigationsPageResponse>(path, {
        version: API_VERSIONS.internal.v1,
        query: { from, size },
      });
    },
    getNextPageParam: nextOffset,
    enabled,
    retry: retryOnTransientError,
  });

  // Not `refetchInterval`, which replays every page the analyst has opened and grows
  // the steady-state request count with each Show more.
  //
  // Deliberately only this one, slow heartbeat — no faster poll while a row is settling. A
  // faster poll here would refetch the very row `useDropDecidedProposal` just removed
  // optimistically, and a refetch too soon after deciding reads the proposal as still pending
  // and restores it (see that hook's own comment).
  const { refetch } = query;
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const poll = setInterval(
      () => void refetch({ refetchPage: isLeadingPage }),
      QUEUE_POLL_INTERVAL_MS
    );
    return () => clearInterval(poll);
  }, [enabled, refetch]);

  return query;
};

export const useOpenInvestigationsByCategoryCount = (category: string, enabled: boolean) =>
  useQueueCount(queryKeys.proposals.byCategoryCount(category), categoryPath(category), enabled);

export const useClosedInvestigationsCount = (enabled: boolean) =>
  useQueueCount(queryKeys.proposals.closedCount(), ALERTZERO_INVESTIGATIONS_CLOSED_URL, enabled);

export const useOpenInvestigationsByCategory = (category: string, options: PagesOptions) =>
  useQueuePages(queryKeys.proposals.byCategory(category), categoryPath(category), options);

export const useClosedInvestigations = (options: PagesOptions) =>
  useQueuePages(queryKeys.proposals.closed(), ALERTZERO_INVESTIGATIONS_CLOSED_URL, options);
