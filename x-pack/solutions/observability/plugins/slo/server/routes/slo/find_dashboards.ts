/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findDashboardsParamsSchema, findDashboardsResponseSchema } from '@kbn/slo-schema';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const findDashboards = createSloServerRoute({
  endpoint: 'GET /internal/observability/dashboards',
  options: { access: 'internal' },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: findDashboardsParamsSchema,
  handler: async ({ context, request, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const soClient = (await context.core).savedObjects.client;

    const results = await soClient.find<{ title: string }>({
      type: 'dashboard',
      search: params?.query?.search,
      perPage: 25,
      page: Number(params?.query?.page ?? 1),
    });

    return findDashboardsResponseSchema.encode({
      perPage: 25,
      page: Number(params?.query?.page ?? 1),
      total: results.total,
      results: results.saved_objects.map((so) => ({
        id: so.id,
        title: so.attributes.title,
      })),
    });
  },
});
