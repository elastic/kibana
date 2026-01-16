/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { registerSoftwareInventoryRoute } from './software_inventory_route';
import { registerSoftwareOverviewRoute } from './software_overview_route';
import { registerSoftwareTransformRoutes } from './software_transform_routes';

export const registerSoftwareRoutes = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  registerSoftwareInventoryRoute(router, logger);
  registerSoftwareOverviewRoute(router, logger);
  registerSoftwareTransformRoutes(router, logger);
};
