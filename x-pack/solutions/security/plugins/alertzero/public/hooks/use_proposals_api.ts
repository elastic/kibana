/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseInfiniteQueryResult, UseQueryResult } from '@kbn/react-query';
import { useInfiniteQuery, useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  ALERTZERO_PROPOSALS_CATEGORY_URL,
  ALERTZERO_PROPOSALS_CLOSED_URL,
} from '@kbn/alertzero-common';
import { retryOnTransientError } from '@kbn/agentic-investigations-plugin/public';
import type { ProposalsPageResponse } from '../../common/proposals/list';
import { MAX_QUEUE_REACH } from '../../common/proposals/list';
import { queryKeys } from '../query_keys';

/**
 * Workers add proposals on their own cadence, so the queue polls. React Query does
 * not poll a disabled query, so a collapsed section refreshes only its count.
 */
export const PROPOSALS_POLL_INTERVAL_MS = 60_000;

const categoryPath = (category: string) =>
  ALERTZERO_PROPOSALS_CATEGORY_URL.replace('{category}', encodeURIComponent(category));

interface PagesOptions {
  firstPageSize: number;
  step: number;
  enabled: boolean;
}

/**
 * The accumulated row count rather than `pages.length * size`, which is what lets
 * the first page be a different size. `undefined` ends the paging.
 */
const nextOffset = (lastPage: ProposalsPageResponse, pages: ProposalsPageResponse[]) => {
  const loaded = pages.reduce((count, page) => count + page.proposals.length, 0);
  return loaded >= lastPage.total || loaded >= MAX_QUEUE_REACH ? undefined : loaded;
};

/** `size: 0` — the bucket's total with none of its rows. */
const useProposalsCount = (
  queryKey: readonly unknown[],
  path: string
): UseQueryResult<ProposalsPageResponse> => {
  const { services } = useKibana();

  return useQuery({
    queryKey,
    queryFn: async (): Promise<ProposalsPageResponse> =>
      services.http!.get<ProposalsPageResponse>(path, {
        version: API_VERSIONS.internal.v1,
        query: { size: 0, from: 0 },
      }),
    refetchInterval: PROPOSALS_POLL_INTERVAL_MS,
    retry: retryOnTransientError,
  });
};

const useProposalsPages = (
  queryKey: readonly unknown[],
  path: string,
  { firstPageSize, step, enabled }: PagesOptions
): UseInfiniteQueryResult<ProposalsPageResponse> => {
  const { services } = useKibana();

  return useInfiniteQuery({
    queryKey,
    // React Query v4 calls the first page with `pageParam: undefined`.
    queryFn: async ({ pageParam }: { pageParam?: number }): Promise<ProposalsPageResponse> => {
      const from = pageParam ?? 0;
      // Shrunk on the last page: the route refuses `from + size` past the reach, so
      // a full step near the ceiling would 400 instead of returning the rows left.
      const size = Math.min(from === 0 ? firstPageSize : step, MAX_QUEUE_REACH - from);
      return services.http!.get<ProposalsPageResponse>(path, {
        version: API_VERSIONS.internal.v1,
        query: { from, size },
      });
    },
    getNextPageParam: nextOffset,
    enabled,
    // A poll refetches every loaded page, so the list does not snap back to page one.
    refetchInterval: PROPOSALS_POLL_INTERVAL_MS,
    retry: retryOnTransientError,
  });
};

export const useProposalsByCategoryCount = (category: string) =>
  useProposalsCount(queryKeys.proposals.byCategoryCount(category), categoryPath(category));

export const useClosedProposalsCount = () =>
  useProposalsCount(queryKeys.proposals.closedCount(), ALERTZERO_PROPOSALS_CLOSED_URL);

export const useProposalsByCategory = (category: string, options: PagesOptions) =>
  useProposalsPages(queryKeys.proposals.byCategory(category), categoryPath(category), options);

export const useClosedProposals = (options: PagesOptions) =>
  useProposalsPages(queryKeys.proposals.closed(), ALERTZERO_PROPOSALS_CLOSED_URL, options);
