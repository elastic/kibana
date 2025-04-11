/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup, Logger } from '@kbn/core/server';
import { ServerRoute, registerRoutes } from '@kbn/server-route-repository';
import { SLORequestHandlerContext, SLORoutesDependencies } from './types';

interface RegisterRoutes {
  core: CoreSetup;
  repository: Record<string, ServerRoute<string, any, any, any, any>>;
  logger: Logger;
  dependencies: SLORoutesDependencies;
  isServerless: boolean;
  isDev: boolean;
}

export function registerServerRoutes({
  repository,
  core,
  logger,
  dependencies,
  isServerless,
  isDev,
}: RegisterRoutes) {
  core.http.registerRouteHandlerContext<SLORequestHandlerContext, 'slo'>(
    'slo',
    async (_context, _request) => {
      return {
        isServerless,
      };
    }
  );

  registerRoutes<SLORoutesDependencies>({
    repository,
    dependencies,
    core,
    logger,
    runDevModeChecks: isDev,
  });
}
