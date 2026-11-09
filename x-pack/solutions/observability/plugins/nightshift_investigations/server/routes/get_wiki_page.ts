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

export const getWikiPageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/wiki/pages/{id}',
  options: {
    access: 'internal',
    summary: 'Get a Wiki page',
    description: 'Returns a single Wiki page by document id.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
  }),
  handler: async ({ request, params, getWikiPageStore, isWikiEnabled }) => {
    if (!isWikiEnabled()) throw notFound('Wiki is not enabled');

    const page = await getWikiPageStore(request).get(params.path.id);
    if (!page) {
      throw notFound(`Wiki page ${params.path.id} was not found`);
    }
    return { page };
  },
});
