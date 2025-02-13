/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, StartServicesAccessor } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../types';
import type { ConfigType } from '../../config';
import type { StartPlugins } from '../../plugin';

export interface AssetInventoryRoutesDeps {
  router: SecuritySolutionPluginRouter;
  logger: Logger;
  config: ConfigType;
  getStartServices: StartServicesAccessor<StartPlugins>;
}
