/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../types';
import type { InitializationFlowRunner } from './flow_registry';
import { initializeRoute } from './routes';

export interface InitializationRoutesDeps {
  router: SecuritySolutionPluginRouter;
  logger: Logger;
  initializationFlowRunner: InitializationFlowRunner;
}

export const registerInitializationRoutes = ({
  router,
  logger,
  initializationFlowRunner,
}: InitializationRoutesDeps): void => {
  initializeRoute(router, logger, initializationFlowRunner);
};
