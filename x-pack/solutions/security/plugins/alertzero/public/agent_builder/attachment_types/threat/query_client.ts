/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient } from '@kbn/react-query';

/**
 * Module-scoped QueryClient for the threat attachment renderer, mirroring
 * `entity_attachment/query_client.ts`. Agent Builder's provider tree does not
 * carry a QueryClientProvider, so each live-fetching attachment renderer
 * supplies its own.
 */
export const threatAttachmentQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});
