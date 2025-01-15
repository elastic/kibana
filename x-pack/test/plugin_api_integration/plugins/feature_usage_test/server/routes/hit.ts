/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { FeatureUsageTestStartDependencies, FeatureUsageTestPluginStart } from '../plugin';

export function registerFeatureHitRoute(
  router: IRouter,
  getStartServices: StartServicesAccessor<
    FeatureUsageTestStartDependencies,
    FeatureUsageTestPluginStart
  >
) {
  router.get(
    {
      path: '/api/feature_usage_test/hit',
      validate: {
        query: schema.object({
          featureName: schema.string(),
          usedAt: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, response) => {
      const [, { licensing }] = await getStartServices();
      try {
        const { featureName, usedAt } = request.query;
        licensing.featureUsage.notifyUsage(featureName, usedAt);
        return response.ok();
      } catch (e) {
        return response.badRequest();
      }
    }
  );
}
