/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { focusManager, useQueryClient } from '@kbn/react-query';
import { PROPOSAL_SETTLING_POLL_INTERVAL_MS, isProposalSettling } from '@kbn/proposals-common';
import type { Proposal } from '@kbn/proposals-common';
import { queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';

/**
 * Refreshes the queue every few seconds while an approved action is still running.
 * The queue polls once a minute. The flyout uses its own `QueryClient`, so it cannot tell this
 * page that the action ended. Without this poll, the row shows "Applying" after the flyout shows
 * the result. The poll stops when no listed proposal is running.
 */
export const useSettlingProposalsPolling = (proposals: Iterable<Proposal>): void => {
  const queryClient = useQueryClient();
  const hasSettling = [...proposals].some(isProposalSettling);

  useEffect(() => {
    if (!hasSettling) {
      return;
    }
    const poll = setInterval(() => {
      if (!focusManager.isFocused()) {
        return;
      }
      // Join a refetch that is still running. Do not cancel it. The queue sections refetch all
      // loaded pages one after another, and that can take longer than one interval.
      void queryClient.invalidateQueries(
        { queryKey: platformQueryKeys.proposals.all },
        { cancelRefetch: false }
      );
    }, PROPOSAL_SETTLING_POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [hasSettling, queryClient]);
};
