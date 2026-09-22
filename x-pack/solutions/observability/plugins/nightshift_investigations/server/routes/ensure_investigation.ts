/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { rethrowInvestigationClientError } from './rethrow_investigation_client_error';

export const ensureInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/investigations/{id}/_ensure',
  options: {
    access: 'internal',
    summary: 'Ensure the investigation record for a workflow execution exists',
    description:
      'Creates the investigation record for a workflow execution if it does not exist yet. ' +
      'Called by the investigation workflow (after ensuring the agent exists) so every run is ' +
      'tracked regardless of how it was triggered. All attributes derive from the execution document, ' +
      'never from the request.',
  },
  security: {
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
    body: z
      .object({
        execution_id: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
        // Rendered empty by the workflow for runs that were not admitted from Slack.
        admission_key: z.string().max(MAX_KEYWORD_LENGTH).optional(),
      })
      // A POST without a body reaches validation as `null`, and older stored workflow
      // definitions still call this route without one.
      .nullish(),
  }),
  handler: async ({ request, params, getInvestigationsClient }) => {
    const client = getInvestigationsClient(request);
    try {
      await client.ensureOrCreate(
        params.path.id,
        params.body?.execution_id,
        params.body?.admission_key || undefined
      );
    } catch (error) {
      rethrowInvestigationClientError(error);
    }
    return { acknowledged: true };
  },
});
