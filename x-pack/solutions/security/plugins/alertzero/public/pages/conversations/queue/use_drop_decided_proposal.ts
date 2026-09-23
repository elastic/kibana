/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { InfiniteData } from '@kbn/react-query';
import { useQueryClient } from '@kbn/react-query';
import type { ProposalsPageResponse } from '../../../../common/proposals/list';
import { queryKeys } from '../../../query_keys';

/** Closed only ever gains a decided proposal, never loses one. */
const OPEN_CATEGORIES = ['respond', 'investigate', 'configure'] as const;

const withoutProposal = (data: InfiniteData<ProposalsPageResponse>, proposalId: string) => ({
  ...data,
  pages: data.pages.map((page) => ({
    ...page,
    // The badge reads this total while the section is open, so it has to fall with
    // the row rather than wait for the poll.
    total: Math.max(page.total - 1, 0),
    proposals: page.proposals.filter(({ id }) => id !== proposalId),
  })),
});

const holds = (data: InfiniteData<ProposalsPageResponse> | undefined, proposalId: string) =>
  Boolean(data?.pages.some((page) => page.proposals.some(({ id }) => id === proposalId)));

/**
 * Takes a just-decided proposal out of its queue. The decision is recorded
 * asynchronously — the route releases the gate and the workflow writes the outcome
 * behind it — so the server still reports it as pending for a moment. The row goes
 * now and the poll reconciles.
 */
export const useDropDecidedProposal = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (proposalId: string) => {
      const category = OPEN_CATEGORIES.find((candidate) =>
        holds(
          queryClient.getQueryData<InfiniteData<ProposalsPageResponse>>(
            queryKeys.proposals.byCategory(candidate)
          ),
          proposalId
        )
      );

      if (!category) {
        return;
      }

      const pagesKey = queryKeys.proposals.byCategory(category);
      const countKey = queryKeys.proposals.byCategoryCount(category);

      // Only this bucket's queries: the same decision also refreshes Closed and the
      // header, and cancelling the whole proposals root would abort those too. The
      // refetch here would read the proposal as still pending and restore the row.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: pagesKey }),
        queryClient.cancelQueries({ queryKey: countKey }),
      ]);

      queryClient.setQueryData<InfiniteData<ProposalsPageResponse>>(pagesKey, (cached) =>
        cached ? withoutProposal(cached, proposalId) : cached
      );
      queryClient.setQueryData<ProposalsPageResponse>(countKey, (cached) =>
        cached ? { ...cached, total: Math.max(cached.total - 1, 0) } : cached
      );
    },
    [queryClient]
  );
};
