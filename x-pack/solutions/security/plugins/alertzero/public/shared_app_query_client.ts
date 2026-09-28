/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient as QueryClientType } from '@kbn/react-query';

let _queryClientPromise: Promise<QueryClientType> | undefined;

/**
 * One `QueryClient` shared by the queue page (`application.tsx`) and the investigation flyout's
 * "Proposed actions" slot (`plugin.ts`'s `LazyProposedActionsSlot`) — see
 * https://github.com/elastic/kibana/pull/292946#discussion_r4092473937. Both surfaces read and
 * decide the same proposals; a queue decision must invalidate the flyout's cache and vice versa,
 * which only a client both actually share can do directly.
 *
 * Memoized behind a `Promise` rather than constructed eagerly at module load: whichever surface
 * mounts first — the queue page via `mount`, or the flyout via the lazy factory — creates it
 * once, and `@kbn/react-query` still only loads when one of them actually does.
 */
export const getSharedAppQueryClient = async (): Promise<QueryClientType> => {
  if (!_queryClientPromise) {
    _queryClientPromise = import('@kbn/react-query').then(
      ({ QueryClient }) =>
        new QueryClient({
          defaultOptions: {
            queries: {
              staleTime: 30_000,
              refetchOnWindowFocus: 'always',
              refetchOnMount: 'always',
            },
          },
        })
    );
  }
  return _queryClientPromise;
};
