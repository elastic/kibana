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
  error: unknown;
  /** Rows Show more can still reach. Labels the control; `canLoadMore` gates it. */
  remaining: number;
  canLoadMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
}

const useSectionState = (
  id: RecommendedAction,
  pagesQueryKey: readonly unknown[]
): { isOpen: boolean; onToggle: (isOpen: boolean) => void } => {
  const [isOpen, setIsOpen] = useState(id !== CLOSED_GROUP_KEY);
  const queryClient = useQueryClient();

  // Dropping the accumulated pages has to happen after the render that disabled the
  // query, or the cache discard races a refetch of the pages we are throwing away.
  useEffect(() => {
    if (!isOpen) {
      queryClient.removeQueries({ queryKey: pagesQueryKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, queryClient]);

  return { isOpen, onToggle: setIsOpen };
};

const useSection = (
  id: RecommendedAction,
  firstPageSize: number,
  isOpen: boolean,
  onToggle: (isOpen: boolean) => void,
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
    loadingRows: pagesQuery.isInitialLoading ? Math.min(total ?? firstPageSize, firstPageSize) : 0,
    error: countQuery.error ?? pagesQuery.error,
    remaining: Math.max(Math.min(total ?? 0, MAX_QUEUE_REACH) - proposals.length, 0),
    // hasNextPage is the authority, so the control is never offered when a click
    // would fetch nothing; `remaining` only labels it.
    canLoadMore: (hasNextPage ?? false) && !pagesQuery.isInitialLoading,
    loadMore,
    isLoadingMore: isFetchingNextPage,
  };
};

export const useCategoryQueueSection = (category: RecommendedAction): QueueSection => {
  const { isOpen, onToggle } = useSectionState(category, queryKeys.proposals.byCategory(category));

  return useSection(
    category,
    CATEGORY_PAGE_SIZE,
    isOpen,
    onToggle,
    useProposalsByCategoryCount(category),
    useProposalsByCategory(category, {
      firstPageSize: CATEGORY_PAGE_SIZE,
      step: SHOW_MORE_STEP,
      enabled: isOpen,
    })
  );
};

export const useClosedQueueSection = (): QueueSection => {
  const { isOpen, onToggle } = useSectionState(CLOSED_GROUP_KEY, queryKeys.proposals.closed());

  return useSection(
    CLOSED_GROUP_KEY,
    CLOSED_PAGE_SIZE,
    isOpen,
    onToggle,
    useClosedProposalsCount(),
    useClosedProposals({
      firstPageSize: CLOSED_PAGE_SIZE,
      step: SHOW_MORE_STEP,
      enabled: isOpen,
    })
  );
};
