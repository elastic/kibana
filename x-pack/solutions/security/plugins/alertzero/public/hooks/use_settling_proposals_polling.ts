/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { focusManager, useQueryClient } from '@kbn/react-query';
import { PROPOSAL_SETTLING_POLL_INTERVAL_MS } from '@kbn/proposals-common';
import type { Proposal } from '@kbn/proposals-common';
import { isInFlux, queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';

/**
 * Refreshes the queue every few seconds while an approved action runs, or while a failed action
 * waits for its retry. It waits for the retry for `RETRY_WAIT_MS` at most.
 * The queue polls once a minute. The flyout uses its own `QueryClient`, so it cannot tell this
 * page that the action ended. Without this poll, the row shows "Applying" after the flyout shows
 * the result. The poll stops when no listed proposal is in either state.
 */
export const useSettlingProposalsPolling = (proposals: Iterable<Proposal>): void => {
  const queryClient = useQueryClient();
  const listed = [...proposals];
  const hasSettling = listed.some(isInFlux);
  // The wait for a retry ends with time, not with a render, so the timer checks it again.
  const listedRef = useRef(listed);
  listedRef.current = listed;

  useEffect(() => {
    if (!hasSettling) {
      return;
    }
    const poll = setInterval(() => {
      if (!focusManager.isFocused() || !listedRef.current.some(isInFlux)) {
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
