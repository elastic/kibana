/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter, Logger } from '@kbn/core/server';
import { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import { registerAggregateRoute } from './aggregate';
import { registerCountRoute } from './count';
import { registerMultiTermsAggregateRoute } from './multi_terms_aggregate';

export const registerRoutes = (
  router: IRouter,
  logger: Logger,
  ruleRegistry: RuleRegistryPluginStartContract
) => {
  registerAggregateRoute(router, logger);
  registerCountRoute(router, logger);
  registerMultiTermsAggregateRoute(router, logger);
};
