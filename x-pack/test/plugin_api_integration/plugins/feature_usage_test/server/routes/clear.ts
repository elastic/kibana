/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, StartServicesAccessor } from 'src/core/server';
import { FeatureUsageTestStartDependencies, FeatureUsageTestPluginStart } from '../plugin';

export function registerFeatureClearRoute(
  router: IRouter,
  getStartServices: StartServicesAccessor<
    FeatureUsageTestStartDependencies,
    FeatureUsageTestPluginStart
  >
) {
  router.get(
    {
      path: '/api/feature_usage_test/clear',
      validate: false,
    },
    async (context, request, response) => {
      const [, { licensing }] = await getStartServices();
      try {
        licensing.featureUsage.clear();
        return response.ok();
      } catch (e) {
        return response.badRequest();
      }
    }
  );
}
