/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { MEMORY_FILTERS } from '../../common/memory';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

const MAX_PAGE_SIZE = 200;

export const listMemoryPagesRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/memory/pages',
  options: {
    access: 'internal',
    summary: 'List Semantic Memory pages',
    description:
      'Returns a cursor-paginated slice of Semantic Memory pages for the current Space, ' +
      'with decayed usefulness and confidence so the UI need not recompute the bandit maths.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  },
  params: z.object({
    query: z
      .object({
        filter: z.enum(MEMORY_FILTERS).optional(),
        cursor: z.string().min(1).max(4096).optional(),
        size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
      })
      .optional()
      .default({}),
  }),
  handler: async ({ request, params, getMemoryPageStore, isMemoryEnabled }) => {
    if (!isMemoryEnabled()) throw notFound('Semantic Memory is not enabled');

    const query = params.query ?? {};
    return getMemoryPageStore(request).listPaginated({
      filter: query.filter ?? 'all',
      cursor: query.cursor,
      size: query.size,
    });
  },
});
