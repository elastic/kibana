/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const getMemoryLineageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/memory/pages/{id}/lineage',
  options: {
    access: 'internal',
    summary: 'Get the memories a Semantic Memory page was merged from',
    description:
      'Returns the direct merge sources of a memory, in the order `merged_from` ' +
      'lists them. An id that no longer resolves is left out, and a page that ' +
      'lists itself is not one of its own sources.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
  }),
  handler: async ({ request, params, getMemoryPageStore, isMemoryEnabled }) => {
    if (!isMemoryEnabled()) throw notFound('Semantic Memory is not enabled');

    const store = getMemoryPageStore(request);
    const root = await store.get(params.path.id);
    if (!root) {
      throw notFound(`Semantic Memory page ${params.path.id} was not found`);
    }

    /**
     * The page's own id is dropped before the read: a memory written by an
     * in-place rewrite lists itself in `merged_from`, and it is not one of its
     * own sources.
     */
    const ids = [...new Set(root.merged_from ?? [])].filter((id) => id !== root.id);
    if (ids.length === 0) {
      return { sources: [] };
    }

    // One mget rather than a get per source. A source the store no longer holds
    // is simply absent from the result, so a deleted memory is not reported as a
    // source with nothing behind it.
    const pages = await store.getMany(ids);

    return { sources: pages.map(({ id, title }) => ({ id, title })) };
  },
});
