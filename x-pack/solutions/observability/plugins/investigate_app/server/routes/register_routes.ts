/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { registerRoutes } from '@kbn/server-route-repository';
import { getGlobalInvestigateAppServerRouteRepository } from './get_global_investigate_app_server_route_repository';
import type { InvestigateAppRouteHandlerResources } from './types';

export function registerServerRoutes({
  core,
  logger,
  dependencies,
  isDev,
}: {
  core: CoreSetup;
  logger: Logger;
  dependencies: Omit<
    InvestigateAppRouteHandlerResources,
    'request' | 'context' | 'logger' | 'params'
  >;
  isDev: boolean;
}) {
  registerRoutes({
    core,
    logger,
    repository: getGlobalInvestigateAppServerRouteRepository(),
    dependencies,
    runDevModeChecks: isDev,
  });
}
