/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { lazySchema, z } from '@kbn/zod/v4';
import type { RequestHandlerContext } from '@kbn/core/server';
import {
  MAX_RUN_LIMIT,
  NIGHTSHIFT_API_PRIVILEGES,
  NIGHTSHIFT_ENABLED_FLAG,
  NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
} from '@kbn/nightshift-shared';
import type { InvestigationQuotasResponse } from '../../common/investigation_quotas';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

const assertNightshiftEnabled = async (context: RequestHandlerContext): Promise<void> => {
  const { featureFlags } = await context.core;
  if (!(await featureFlags.getBooleanValue(NIGHTSHIFT_ENABLED_FLAG, false))) {
    throw notFound();
  }
};

// A limit of 0 would deny every start, so `null` is the only way to remove a limit.
const limitUpdateSchema = lazySchema(() =>
  z.number().int().min(1).max(MAX_RUN_LIMIT).nullable().optional()
);

export const investigationQuotasUpdateBodySchema = lazySchema(() =>
  z
    .object({
      enabled: z.boolean().optional(),
      limits: z
        .object({
          automatic_investigation: limitUpdateSchema,
          manual_investigation: limitUpdateSchema,
          total_investigation: limitUpdateSchema,
        })
        .strict()
        .optional(),
    })
    .strict()
    .refine(
      ({ enabled, limits }) =>
        enabled !== undefined ||
        (limits !== undefined && Object.values(limits).some((limit) => limit !== undefined)),
      { message: 'At least one investigation quota setting is required' }
    )
);

const getInvestigationQuotasRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/investigation_quotas',
  options: {
    access: 'internal',
    summary: 'Get the daily investigation limits and usage',
    description:
      'Returns the deployment-wide daily limits on new investigations, today’s counts, and whether the caller may change the limits.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } },
  params: lazySchema(() => z.object({})),
  handler: async ({
    context,
    request,
    investigationQuotaClient,
  }): Promise<InvestigationQuotasResponse> => {
    await assertNightshiftEnabled(context);
    return investigationQuotaClient.get(request);
  },
});

const putInvestigationQuotasRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PUT /internal/nightshift/investigation_quotas',
  options: {
    access: 'internal',
    summary: 'Update the daily investigation limits',
    description:
      'Turns enforcement of the daily limits on or off, or changes limits. A limit of null removes it. Takes the manage and configure privileges in all spaces.',
  },
  security: {
    authz: { requiredPrivileges: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES },
  },
  params: lazySchema(() => z.object({ body: investigationQuotasUpdateBodySchema })),
  handler: async ({
    context,
    request,
    params,
    investigationQuotaClient,
  }): Promise<InvestigationQuotasResponse> => {
    await assertNightshiftEnabled(context);
    return investigationQuotaClient.update(request, params.body);
  },
});

export const investigationQuotaRoutes = {
  ...getInvestigationQuotasRoute,
  ...putInvestigationQuotasRoute,
};
