/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { InfiniteData } from '@kbn/react-query';
import { useQueryClient } from '@kbn/react-query';
import { queryKeys as platformQueryKeys } from '@kbn/agentic-investigations-plugin/public';
import type { ProposalsPageResponse } from '../../../../common/proposals/list';
import { queryKeys } from '../../../query_keys';

/** Closed only ever gains a decided proposal, never loses one. */
const OPEN_CATEGORIES = ['respond', 'investigate', 'configure'] as const;

const withoutProposal = (
  data: InfiniteData<ProposalsPageResponse> | undefined,
  proposalId: string
) => {
  if (!data) {
    return { data, removed: false };
  }

  let removed = false;
  const pages = data.pages.map((page) => {
    const proposals = page.proposals.filter(({ id }) => id !== proposalId);
    removed = removed || proposals.length !== page.proposals.length;
    return { ...page, proposals };
  });

  return { data: removed ? { ...data, pages } : data, removed };
};

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
      // The refetch the mutation just triggered would read this proposal as still
      // pending and put the row straight back.
      await queryClient.cancelQueries({ queryKey: platformQueryKeys.proposals.all });

      OPEN_CATEGORIES.forEach((category) => {
        let removed = false;

        queryClient.setQueryData<InfiniteData<ProposalsPageResponse>>(
          queryKeys.proposals.byCategory(category),
          (cached) => {
            const result = withoutProposal(cached, proposalId);
            removed = result.removed;
            return result.data;
          }
        );

        if (removed) {
          queryClient.setQueryData<ProposalsPageResponse>(
            queryKeys.proposals.byCategoryCount(category),
            (cached) => (cached ? { ...cached, total: Math.max(cached.total - 1, 0) } : cached)
          );
        }
      });
    },
    [queryClient]
  );
};
