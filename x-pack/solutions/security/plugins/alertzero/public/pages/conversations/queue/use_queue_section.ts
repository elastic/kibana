/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UseInfiniteQueryResult, UseQueryResult } from '@kbn/react-query';
import { useQueryClient } from '@kbn/react-query';
import type { Investigation, RecommendedAction } from '@kbn/agentic-investigations-common';
import {
  useClosedProposals,
  useClosedProposalsCount,
  useProposalsByCategory,
  useProposalsByCategoryCount,
} from '../../../hooks/use_proposals_api';
import type { ProposalItem, ProposalsPageResponse } from '../../../../common/proposals/list';
import { CLOSED_GROUP_KEY, MAX_QUEUE_REACH } from '../../../../common/proposals/list';
import { queryKeys } from '../../../query_keys';
import { proposalToInvestigation } from '../proposal_to_investigation';

/** Category queues open smaller than Closed, which is a 72 h backlog. */
export const CATEGORY_PAGE_SIZE = 10;
export const CLOSED_PAGE_SIZE = 25;

/** Every queue grows by this much per Show more, whatever it opened with. */
export const SHOW_MORE_STEP = 10;

/** One queue accordion: its queries, its open state, its counts. */
export interface QueueSection {
  id: RecommendedAction;
  /** Bucket size from a count-only read, so a collapsed section knows it too. */
  total: number | undefined;
  proposals: ProposalItem[];
  investigations: Investigation[];
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  /** Placeholder rows while the first page is in flight, bounded by what is coming. */
  loadingRows: number;
  /**
   * Rows failed with nothing cached. Per section and against its own cache: an
   * aggregate let a neighbour's success mask a failure, and a failed refetch must
   * not blank rows still worth reading.
   */
  hasLoadError: boolean;
  /** The analyst's own Show more failed, as opposed to a poll they never asked for. */
  hasLoadMoreError: boolean;
  hasCountError: boolean;
  /** Refetches both of this section's queries, behind the failure's retry. */
  retry: () => void;
  /** Labels Show more; `canLoadMore` is what gates it. */
  remaining: number;
  canLoadMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
}

/** Derived from the bucket, so `retry` stays referentially stable. */
const keysFor = (id: RecommendedAction) =>
  id === CLOSED_GROUP_KEY
    ? { pages: queryKeys.proposals.closed(), count: queryKeys.proposals.closedCount() }
    : {
        pages: queryKeys.proposals.byCategory(id),
        count: queryKeys.proposals.byCategoryCount(id),
      };

const useSectionState = (id: RecommendedAction) => {
  const [isOpen, setIsOpen] = useState(id !== CLOSED_GROUP_KEY);
  const queryClient = useQueryClient();

  // After the render that disabled the query, or the discard races a refetch of the
  // pages being thrown away.
  useEffect(() => {
    if (!isOpen) {
      queryClient.removeQueries({ queryKey: keysFor(id).pages });
    }
  }, [isOpen, queryClient, id]);

  // Keyed off the bucket, not the query objects, or the memoised queue re-renders
  // on every poll.
  const retry = useCallback(() => {
    const { pages, count } = keysFor(id);
    void queryClient.refetchQueries({ queryKey: pages });
    void queryClient.refetchQueries({ queryKey: count });
  }, [queryClient, id]);

  return { isOpen, onToggle: setIsOpen, retry };
};

/**
 * Every page repeats the bucket total, so loaded rows answer the count for free.
 * The first page, which a refetch renews before the rest.
 */
const totalFromPages = (pagesQuery: UseInfiniteQueryResult<ProposalsPageResponse>) =>
  pagesQuery.data?.pages[0]?.total;

/** The count-only read earns its request until the rows can answer instead. */
const needsCountRequest = (
  isOpen: boolean,
  pagesQuery: UseInfiniteQueryResult<ProposalsPageResponse>
) => !isOpen || totalFromPages(pagesQuery) === undefined;

const useSection = (
  id: RecommendedAction,
  firstPageSize: number,
  { isOpen, onToggle, retry }: ReturnType<typeof useSectionState>,
  countQuery: UseQueryResult<ProposalsPageResponse>,
  pagesQuery: UseInfiniteQueryResult<ProposalsPageResponse>
): QueueSection => {
  const pages = pagesQuery.data?.pages;

  // Deduplicated because the pages are offset windows over a list that moves: a row
  // decided between two fetches shifts everything after it up, and an optimistic drop
  // shortens a cached page without moving the offsets already paged past.
  const proposals = useMemo(
    () => [
      ...new Map((pages ?? []).flatMap((page) => page.proposals).map((p) => [p.id, p])).values(),
    ],
    [pages]
  );
  const investigations = useMemo(() => proposals.map(proposalToInvestigation), [proposals]);

  const total = totalFromPages(pagesQuery) ?? countQuery.data?.total;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = pagesQuery;

  // Tracked from the click rather than read off `pagesQuery.error`, which a failed
  // poll sets just the same — and a poll the analyst did not ask for must not
  // report that their Show more failed.
  const [hasLoadMoreError, setHasLoadMoreError] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setHasLoadMoreError(false);
    }
  }, [isOpen]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      setHasLoadMoreError(false);
      // `throwOnError` is the only way to hear about this fetch alone: v4 has no
      // `isFetchNextPageError`, and the query's own error outlives it.
      fetchNextPage({ throwOnError: true }).catch(() => setHasLoadMoreError(true));
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return {
    id,
    total,
    proposals,
    investigations,
    isOpen,
    onToggle,
    retry,
    loadingRows: pagesQuery.isInitialLoading ? Math.min(total ?? firstPageSize, firstPageSize) : 0,
    hasLoadError: Boolean(pagesQuery.error) && proposals.length === 0,
    hasLoadMoreError,
    hasCountError: Boolean(countQuery.error) && total === undefined,
    remaining: Math.max(Math.min(total ?? 0, MAX_QUEUE_REACH) - proposals.length, 0),
    // The authority, so the control is never offered when a click fetches nothing.
    canLoadMore: (hasNextPage ?? false) && !pagesQuery.isInitialLoading,
    loadMore,
    isLoadingMore: isFetchingNextPage,
  };
};

export const useCategoryQueueSection = (category: RecommendedAction): QueueSection => {
  const state = useSectionState(category);
  const pagesQuery = useProposalsByCategory(category, {
    firstPageSize: CATEGORY_PAGE_SIZE,
    step: SHOW_MORE_STEP,
    enabled: state.isOpen,
  });
  const countQuery = useProposalsByCategoryCount(
    category,
    needsCountRequest(state.isOpen, pagesQuery)
  );

  return useSection(category, CATEGORY_PAGE_SIZE, state, countQuery, pagesQuery);
};

export const useClosedQueueSection = (): QueueSection => {
  const state = useSectionState(CLOSED_GROUP_KEY);
  const pagesQuery = useClosedProposals({
    firstPageSize: CLOSED_PAGE_SIZE,
    step: SHOW_MORE_STEP,
    enabled: state.isOpen,
  });
  const countQuery = useClosedProposalsCount(needsCountRequest(state.isOpen, pagesQuery));

  return useSection(CLOSED_GROUP_KEY, CLOSED_PAGE_SIZE, state, countQuery, pagesQuery);
};
