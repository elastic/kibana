/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const getInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/investigations/{id}',
  options: {
    access: 'internal',
    summary: 'Get an investigation',
    description: 'Retrieves the current state of an investigation by ID.',
  },
  security: {
    authz: {
      requiredPrivileges: ['all'],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1),
    }),
  }),
  handler: async ({ request, params, getClient }) => {
    const client = getClient(request);
    try {
      return await client.get(params.path.id);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        throw notFound(err.message);
      }
      throw err;
    }
  },
});
