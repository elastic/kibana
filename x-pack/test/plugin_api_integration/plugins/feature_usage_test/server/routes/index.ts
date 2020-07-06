/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, StartServicesAccessor } from 'src/core/server';
import { FeatureUsageTestStartDependencies, FeatureUsageTestPluginStart } from '../plugin';

import { registerFeatureHitRoute } from './hit';

export function registerRoutes(
  router: IRouter,
  getStartServices: StartServicesAccessor<
    FeatureUsageTestStartDependencies,
    FeatureUsageTestPluginStart
  >
) {
  registerFeatureHitRoute(router, getStartServices);
}
