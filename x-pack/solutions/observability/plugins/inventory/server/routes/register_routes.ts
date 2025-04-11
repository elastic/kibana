/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { registerRoutes } from '@kbn/server-route-repository';
import { getGlobalInventoryServerRouteRepository } from './get_global_inventory_route_repository';
import type { InventoryRouteHandlerResources } from './types';

export function registerServerRoutes({
  core,
  logger,
  dependencies,
  isDev,
}: {
  core: CoreSetup;
  logger: Logger;
  dependencies: Omit<InventoryRouteHandlerResources, 'request' | 'context' | 'logger' | 'params'>;
  isDev: boolean;
}) {
  registerRoutes({
    core,
    logger,
    repository: getGlobalInventoryServerRouteRepository(),
    dependencies,
    runDevModeChecks: isDev,
  });
}
