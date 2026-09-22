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
  /**
   * Bucket size on the server, from a count-only read so a collapsed section still
   * knows it. `undefined` until that read lands.
   */
  total: number | undefined;
  proposals: ProposalItem[];
  investigations: Investigation[];
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  /**
   * Placeholder rows to render while the first page is in flight, 0 when it is not.
   * Bounded by the page about to arrive, so the scaffold matches the list.
   */
  loadingRows: number;
  /**
   * The rows failed with nothing cached behind them. Judged per section and against
   * this section's own cache: aggregating across the queue let a neighbour's success
   * mask a failure, and a failed refetch must not blank rows still worth reading.
   */
  hasLoadError: boolean;
  /** The count failed, so this section cannot say how big it is. */
  hasCountError: boolean;
  /** Refetches both of this section's queries, behind the failure's retry control. */
  retry: () => void;
  /** Rows Show more can still reach. Labels the control; `canLoadMore` gates it. */
  remaining: number;
  canLoadMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
}

/** Both of a section's keys, derived from its bucket so `retry` can stay stable. */
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

  // Dropping the accumulated pages has to happen after the render that disabled the
  // query, or the cache discard races a refetch of the pages we are throwing away.
  useEffect(() => {
    if (!isOpen) {
      queryClient.removeQueries({ queryKey: keysFor(id).pages });
    }
  }, [isOpen, queryClient, id]);

  // Keyed off the bucket rather than the query objects, so the memoised queue is not
  // re-rendered by a new callback on every poll.
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

  // Flattening on every render would re-sort the page's merged union each time.
  const proposals = useMemo(() => pages?.flatMap(({ proposals: rows }) => rows) ?? [], [pages]);
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
    // hasNextPage is the authority, so the control is never offered when a click
    // would fetch nothing; `remaining` only labels it.
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
