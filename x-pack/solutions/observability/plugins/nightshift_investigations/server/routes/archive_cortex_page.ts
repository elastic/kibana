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

export const archiveCortexPageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'DELETE /internal/nightshift/cortex/pages/{id}',
  options: {
    access: 'internal',
    summary: 'Archive a Cortex page',
    description:
      'Soft-deletes a Cortex wiki page by archiving it, so it stops being loaded into investigations but stays restorable.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:write'] },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
  }),
  handler: async ({ request, params, getCortexPageStore, isCortexEnabled }) => {
    if (!isCortexEnabled()) throw notFound('Cortex is not enabled');

    const page = await getCortexPageStore(request).archive(params.path.id);
    if (!page) {
      throw notFound(`Cortex page ${params.path.id} was not found`);
    }
    return { page };
  },
});
