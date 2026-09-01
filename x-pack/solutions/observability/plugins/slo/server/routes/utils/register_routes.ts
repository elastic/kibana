/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ServerRoute } from '@kbn/server-route-repository';
import { registerRoutes } from '@kbn/server-route-repository';
import type { SLORoutesDependencies } from './types';

interface RegisterRoutes {
  core: CoreSetup;
  repository: Record<string, ServerRoute<string, any, any, any, any>>;
  logger: Logger;
  dependencies: SLORoutesDependencies;
  isDev: boolean;
}

export function registerServerRoutes({
  repository,
  core,
  logger,
  dependencies,
  isDev,
}: RegisterRoutes) {
  registerRoutes<SLORoutesDependencies>({
    repository,
    dependencies,
    core,
    logger,
    runDevModeChecks: isDev,
  });
}
