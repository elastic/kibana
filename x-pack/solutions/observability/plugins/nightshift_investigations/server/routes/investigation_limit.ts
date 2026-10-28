/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { MAX_INVESTIGATION_LIMIT } from '../saved_objects/investigation_limit_saved_object';
import {
  readInvestigationLimit,
  readInvestigationUsage,
  writeInvestigationLimit,
} from '../lib/investigation_limit/global_investigation_budget';

export const getInvestigationLimitRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift_investigations/investigation_limit',
  options: {
    access: 'internal',
    summary: 'Get the global investigation limit',
    description: 'Returns the daily limit of automatic investigations and the number used today.',
  },
  security: {
    authz: { requiredPrivileges: ['read_nightshift'] },
  },
  handler: async ({ request, getAutomationsSoClient, context }) => {
    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const soClient = getAutomationsSoClient(request, spaceId);
    const [limit, used] = await Promise.all([
      readInvestigationLimit(soClient),
      readInvestigationUsage(soClient),
    ]);
    return { limit: limit ?? null, used };
  },
});

export const updateInvestigationLimitRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PUT /internal/nightshift_investigations/investigation_limit',
  options: {
    access: 'internal',
    summary: 'Update the global investigation limit',
    description: 'Sets the daily limit of automatic investigations. Omit the limit to remove it.',
  },
  security: {
    authz: { requiredPrivileges: ['manage_nightshift'] },
  },
  params: lazySchema(() =>
    z.object({
      body: z.object({
        limit: z.number().int().min(1).max(MAX_INVESTIGATION_LIMIT).nullable(),
      }),
    })
  ),
  handler: async ({ request, params, getAutomationsSoClient, context }) => {
    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const soClient = getAutomationsSoClient(request, spaceId);
    await writeInvestigationLimit(soClient, params.body.limit ?? undefined);
    const used = await readInvestigationUsage(soClient);
    return { limit: params.body.limit, used };
  },
});
