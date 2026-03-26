/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetInventoryRoutesDeps } from '../types';
import { deleteAssetInventoryRoute } from './delete';
import { enableAssetInventoryRoute } from './enablement';
import { statusAssetInventoryRoute } from './status';
import { installAssetInventoryDataViewRoute } from './install_data_view';

export const registerAssetInventoryRoutes = ({ router, logger }: AssetInventoryRoutesDeps) => {
  enableAssetInventoryRoute(router, logger);
  deleteAssetInventoryRoute(router, logger);
  statusAssetInventoryRoute(router, logger);
  installAssetInventoryDataViewRoute(router, logger);
};
