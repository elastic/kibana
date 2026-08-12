/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    // agentBuilder:write is required to start an investigation because the result is an Agent
    // Builder conversation. A user without at least agentBuilder:read cannot interact with the
    // resulting conversation, making the investigation useless to them. Requiring write (rather
    // than read) reflects that starting an investigation creates a new conversation and consumes
    // AI resources. When conversation templates land with their own privilege model, this should
    // be revisited.
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    body: z.object({
      subject: z.object({
        type: z.enum(['significant_event', 'alert']),
        id: z.string().min(1),
      }),
      concurrency_key: z.string().optional(),
      context: z.record(z.unknown()).optional(),
    }),
  }),
  handler: async ({ request, params, getClient }) => {
    const client = getClient(request);
    const result = await client.start(params.body);
    return result;
  },
});
