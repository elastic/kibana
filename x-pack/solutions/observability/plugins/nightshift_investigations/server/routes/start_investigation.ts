/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const startInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/investigations',
  options: {
    access: 'internal',
    summary: 'Start an investigation',
    description: 'Triggers an investigation workflow for a given subject.',
  },
  security: {
    authz: {
      requiredPrivileges: ['all'],
    },
  },
  params: z.object({
    body: z.object({
      subject: z.object({
        type: z.enum(['significant_event', 'alert']),
        id: z.string().min(1),
      }),
      context: z.record(z.unknown()).optional(),
    }),
  }),
  handler: async ({ request, params, getClient }) => {
    const client = getClient(request);
    const result = await client.start(params.body);
    return result;
  },
});
