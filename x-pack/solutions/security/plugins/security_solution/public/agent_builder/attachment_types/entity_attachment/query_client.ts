/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient } from '@kbn/react-query';

/**
 * Module-scoped QueryClient for the entity attachment renderer.
 *
 * The rich renderer mounts inside Agent Builder's provider tree, which does
 * not carry Security Solution's own QueryClientProvider. A colocated client
 * here satisfies the `useQuery` calls made by `useEntityFromStore` and any
 * future sibling hooks, while keeping the cache shared across cards/tables
 * rendered in the same conversation (instead of per-mount).
 */
export const entityAttachmentQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});
