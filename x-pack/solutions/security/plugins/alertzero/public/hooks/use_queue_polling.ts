/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { QueryKey } from '@kbn/react-query';
import { focusManager, useQueryClient } from '@kbn/react-query';

export const QUEUE_POLL_INTERVAL_MS = 60_000;

const isLeadingPage = <TPage>(_page: TPage, index: number) => index === 0;

/**
 * Refetches the page's active queries together once a minute while the tab is visible: first page
 * only for `queryKeys`, every loaded page for `allPagesKeys`.
 */
export const useQueuePolling = (
  queryKeys: readonly QueryKey[],
  allPagesKeys: readonly QueryKey[] = []
): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const poll = setInterval(() => {
      if (!focusManager.isFocused()) {
        return;
      }
      queryKeys.forEach((queryKey) => {
        void queryClient.refetchQueries({ queryKey, type: 'active', refetchPage: isLeadingPage });
      });
      allPagesKeys.forEach((queryKey) => {
        void queryClient.refetchQueries({ queryKey, type: 'active' });
      });
    }, QUEUE_POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [queryClient, queryKeys, allPagesKeys]);
};
