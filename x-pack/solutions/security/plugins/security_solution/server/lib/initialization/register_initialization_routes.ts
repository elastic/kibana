/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, StartServicesAccessor } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../types';
import type { StartPlugins } from '../../plugin_contract';
import type { InitializationFlowRegistry } from './flow_registry';
import { initializeRoute, statusRoute } from './routes';

export interface InitializationRoutesDeps {
  router: SecuritySolutionPluginRouter;
  logger: Logger;
  flowRegistry: InitializationFlowRegistry;
  getStartServices: StartServicesAccessor<StartPlugins>;
}

export const registerInitializationRoutes = ({
  router,
  logger,
  flowRegistry,
  getStartServices,
}: InitializationRoutesDeps): void => {
  initializeRoute(router, logger, flowRegistry, getStartServices);
  statusRoute(router, logger, flowRegistry);
};
