/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { QueryKey } from '@kbn/react-query';
import { focusManager, useQueryClient } from '@kbn/react-query';

/** Workers add proposals on their own cadence, so a queue page refreshes once a minute. */
export const QUEUE_POLL_INTERVAL_MS = 60_000;

/** Refetching every loaded page would make each Show more cost another request a minute. */
const isLeadingPage = (_page: unknown, index: number) => index === 0;

/**
 * One heartbeat for everything a queue page shows, so pills, badges and rows refresh in the same
 * tick instead of drifting apart on timers of their own. Only active queries are refetched, so a
 * collapsed section polls its count and an open one polls its leading page. Skipped while the tab
 * is hidden. `queryKeys` is a prefix list and must be referentially stable.
 */
export const useQueuePolling = (queryKeys: readonly QueryKey[]): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const poll = setInterval(() => {
      if (!focusManager.isFocused()) {
        return;
      }
      queryKeys.forEach((queryKey) => {
        void queryClient.refetchQueries({ queryKey, type: 'active', refetchPage: isLeadingPage });
      });
    }, QUEUE_POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [queryClient, queryKeys]);
};
