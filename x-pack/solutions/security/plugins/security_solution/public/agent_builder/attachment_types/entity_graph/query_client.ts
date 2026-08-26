/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient } from '@kbn/react-query';

/**
 * Module-scoped QueryClient for the graph preview attachment renderer.
 *
 * The renderer mounts inside Agent Builder's provider tree, which does not
 * carry Security Solution's own QueryClientProvider. A colocated client here
 * satisfies the `useQuery` calls made by `useFetchGraphData`, keeping the graph
 * cache shared across previews rendered in the same conversation instead of
 * per-mount.
 */
export const entityGraphQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});
