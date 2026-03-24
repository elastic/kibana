/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { assetCriticalityInternalStatusRoute } from './status';
import { assetCriticalityPublicUpsertRoute } from './upsert';
import { assetCriticalityPublicGetRoute } from './get';
import { assetCriticalityPublicDeleteRoute } from './delete';
import { assetCriticalityInternalPrivilegesRoute } from './privileges';
import { assetCriticalityPublicCSVUploadRoute } from './upload_csv';
import { assetCriticalityPublicListRoute } from './list';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { assetCriticalityPublicBulkUploadRoute } from './bulk_upload';

export const registerAssetCriticalityRoutes = (deps: EntityAnalyticsRoutesDeps) => {
  // Internal routes
  assetCriticalityInternalPrivilegesRoute(deps);
  assetCriticalityInternalStatusRoute(deps);
  // Public routes
  assetCriticalityPublicCSVUploadRoute(deps);
  assetCriticalityPublicBulkUploadRoute(deps);
  assetCriticalityPublicDeleteRoute(deps);
  assetCriticalityPublicGetRoute(deps);
  assetCriticalityPublicListRoute(deps);
  assetCriticalityPublicUpsertRoute(deps);
};
