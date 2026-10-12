/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { InfiniteData } from '@kbn/react-query';
import { useQueryClient } from '@kbn/react-query';
import type {
  InvestigationQueueItem,
  InvestigationsPageResponse,
} from '../../../../common/investigations/queue';
import { queryKeys } from '../../../query_keys';

/** Closed only ever gains an investigation after a close, never after a decision. */
const OPEN_CATEGORIES = ['respond', 'investigate', 'configure'] as const;

const isDecidedRow = ({ leadProposal }: InvestigationQueueItem, proposalId: string) =>
  leadProposal?.id === proposalId;

/** The investigation stays in its category; only the decided proposal stops being offered. */
const withoutLeadProposal = ({
  leadProposal,
  pendingProposalCount,
  ...item
}: InvestigationQueueItem): InvestigationQueueItem => ({
  ...item,
  pendingProposalCount: Math.max((pendingProposalCount ?? 1) - 1, 0),
});

const settle = (data: InfiniteData<InvestigationsPageResponse>, proposalId: string) => ({
  ...data,
  pages: data.pages.map((page) => ({
    ...page,
    investigations: page.investigations.map((item) =>
      isDecidedRow(item, proposalId) ? withoutLeadProposal(item) : item
    ),
  })),
});

const holds = (data: InfiniteData<InvestigationsPageResponse> | undefined, proposalId: string) =>
  Boolean(
    data?.pages.some((page) => page.investigations.some((item) => isDecidedRow(item, proposalId)))
  );

/**
 * Stops offering a just-decided proposal on its investigation's card. The decision is
 * recorded asynchronously — the route releases the gate and the workflow writes the
 * outcome behind it — so the server still reports the proposal as pending for a moment.
 * The card loses its proposal now and the poll reconciles, including which proposal, if
 * any, leads next. The investigation keeps its place: it still has a proposal in the
 * category, so only the sections' totals are untouched.
 */
export const useDropDecidedProposal = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (proposalId: string) => {
      const category = OPEN_CATEGORIES.find((candidate) =>
        holds(
          queryClient.getQueryData<InfiniteData<InvestigationsPageResponse>>(
            queryKeys.proposals.byCategory(candidate)
          ),
          proposalId
        )
      );

      if (!category) {
        return;
      }

      const pagesKey = queryKeys.proposals.byCategory(category);

      // Only this bucket's rows: the same decision also refreshes Closed and the header,
      // and cancelling the whole proposals root would abort those too. A refetch here
      // would read the proposal as still pending and restore it.
      await queryClient.cancelQueries({ queryKey: pagesKey });

      queryClient.setQueryData<InfiniteData<InvestigationsPageResponse>>(pagesKey, (cached) =>
        cached ? settle(cached, proposalId) : cached
      );
    },
    [queryClient]
  );
};
