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

  const total = countQuery.data?.total;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = pagesQuery;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
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

  return useSection(
    category,
    CATEGORY_PAGE_SIZE,
    state,
    useProposalsByCategoryCount(category),
    useProposalsByCategory(category, {
      firstPageSize: CATEGORY_PAGE_SIZE,
      step: SHOW_MORE_STEP,
      enabled: state.isOpen,
    })
  );
};

export const useClosedQueueSection = (): QueueSection => {
  const state = useSectionState(CLOSED_GROUP_KEY);

  return useSection(
    CLOSED_GROUP_KEY,
    CLOSED_PAGE_SIZE,
    state,
    useClosedProposalsCount(),
    useClosedProposals({
      firstPageSize: CLOSED_PAGE_SIZE,
      step: SHOW_MORE_STEP,
      enabled: state.isOpen,
    })
  );
};
