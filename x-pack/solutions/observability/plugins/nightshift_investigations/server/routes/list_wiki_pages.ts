/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { z, lazySchema } from '@kbn/zod/v4';
import { WIKI_ENTITY_TYPES, WIKI_PAGE_STATUSES } from '../../common/wiki';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const listWikiPagesRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/wiki/pages',
  options: {
    access: 'internal',
    summary: 'List Wiki pages',
    description: 'Returns Wiki pages stored in the Context Engine AI index.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  },
  params: lazySchema(() =>
    z.object({
      query: z
        .object({
          status: z.enum(WIKI_PAGE_STATUSES).optional(),
          entity_type: z.enum(WIKI_ENTITY_TYPES).optional(),
        })
        .optional()
        .default({}),
    })
  ),
  handler: async ({ request, params, getWikiPageStore, isWikiEnabled }) => {
    if (!isWikiEnabled()) throw notFound('Wiki is not enabled');

    const store = getWikiPageStore(request);
    return store.list({
      status: params.query?.status,
      entityType: params.query?.entity_type,
    });
  },
});
