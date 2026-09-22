/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { UseQueryResult } from '@kbn/react-query';
import type { Investigation, RecommendedAction } from '@kbn/agentic-investigations-common';
import { useClosedProposals, useProposalsByCategory } from '../../../hooks/use_proposals_api';
import type { ProposalItem, ProposalsPageResponse } from '../../../../common/proposals/list';
import { CLOSED_GROUP_KEY, MAX_QUEUE_PAGE_SIZE } from '../../../../common/proposals/list';
import { proposalToInvestigation } from '../proposal_to_investigation';

/** Category queues page in smaller steps than Closed, which is a 72 h backlog. */
export const CATEGORY_PAGE_SIZE = 10;
export const CLOSED_PAGE_SIZE = 25;

/** One queue accordion: its query, its open state, its page size, its counts. */
export interface QueueSection {
  id: RecommendedAction;
  /**
   * Bucket size on the server, independent of how many rows are loaded.
   * `undefined` until the first response.
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
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * Open state drives the page size: a collapsed section asks for `size: 0`, which
 * returns the bucket total and no rows. Collapsing also resets the cursor, so
 * reopening refetches from the first page.
 */
const useSectionState = (id: RecommendedAction, pageSize: number) => {
  const [isOpen, setIsOpen] = useState(id !== CLOSED_GROUP_KEY);
  const [pages, setPages] = useState(1);

  const onToggle = useCallback((next: boolean) => {
    setIsOpen(next);
    if (!next) {
      setPages(1);
    }
  }, []);

  const loadMore = useCallback(() => setPages((current) => current + 1), []);
  const size = isOpen ? Math.min(pages * pageSize, MAX_QUEUE_PAGE_SIZE) : 0;

  return { isOpen, onToggle, loadMore, size };
};

const toSection = (
  id: RecommendedAction,
  state: ReturnType<typeof useSectionState>,
  pageSize: number,
  query: UseQueryResult<ProposalsPageResponse>
): QueueSection => {
  const proposals = query.data?.proposals ?? [];
  const total = query.data?.total;
  // keepPreviousData holds the previous page across a size change, so isFetching
  // rather than isLoading is what says "rows are on the way".
  const isLoadingRows = state.isOpen && query.isFetching && proposals.length === 0;

  return {
    id,
    total,
    proposals,
    investigations: proposals.map(proposalToInvestigation),
    isOpen: state.isOpen,
    onToggle: state.onToggle,
    loadingRows: isLoadingRows ? Math.min(total ?? pageSize, pageSize) : 0,
    error: query.error,
    hasMore: total !== undefined && proposals.length < total,
    loadMore: state.loadMore,
  };
};

export const useCategoryQueueSection = (category: RecommendedAction): QueueSection => {
  const state = useSectionState(category, CATEGORY_PAGE_SIZE);

  return toSection(
    category,
    state,
    CATEGORY_PAGE_SIZE,
    useProposalsByCategory(category, { size: state.size, from: 0 })
  );
};

export const useClosedQueueSection = (): QueueSection => {
  const state = useSectionState(CLOSED_GROUP_KEY, CLOSED_PAGE_SIZE);

  return toSection(
    CLOSED_GROUP_KEY,
    state,
    CLOSED_PAGE_SIZE,
    useClosedProposals({ size: state.size, from: 0 })
  );
};
