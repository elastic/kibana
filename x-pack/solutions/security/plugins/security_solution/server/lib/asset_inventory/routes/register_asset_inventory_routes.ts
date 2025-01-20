/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetInventoryRoutesDeps } from '../types';
import { deleteAssetInventoryRoute } from './delete';
import { enableAssetInventoryRoute } from './enablement';

export const registerAssetInventoryRoutes = ({
  router,
  logger,
  config,
}: AssetInventoryRoutesDeps) => {
  enableAssetInventoryRoute(router, logger, config);
  deleteAssetInventoryRoute(router, logger);
};
