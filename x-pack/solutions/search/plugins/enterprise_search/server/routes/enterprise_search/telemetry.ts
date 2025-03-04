/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { ES_TELEMETRY_NAME } from '../../collectors/enterprise_search/telemetry';
import { incrementUICounter } from '../../collectors/lib/telemetry';

import type { RouteDependencies } from '../../types';

const productToTelemetryMap = {
  enterprise_search: ES_TELEMETRY_NAME,
};

export function registerTelemetryRoute({ router, getSavedObjectsService }: RouteDependencies) {
  router.put(
    {
      path: '/internal/enterprise_search/stats',
      validate: {
        body: schema.object({
          product: schema.oneOf([schema.literal('enterprise_search')]),
          action: schema.oneOf([
            schema.literal('viewed'),
            schema.literal('clicked'),
            schema.literal('error'),
          ]),
          metric: schema.string(),
        }),
      },
    },
    async (ctx, request, response) => {
      const { product, action, metric } = request.body;

      if (!getSavedObjectsService) throw new Error('Could not find Saved Objects service');

      return response.ok({
        body: await incrementUICounter({
          id: productToTelemetryMap[product],
          savedObjects: getSavedObjectsService(),
          uiAction: `ui_${action}`,
          metric,
        }),
      });
    }
  );
}
