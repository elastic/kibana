/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { registerListSnapshotsRoute } from './list_snapshots_route';
import { registerSnapshotCompareRoute } from './compare_route';

export const registerSnapshotRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  registerListSnapshotsRoute(router, logger);
  registerSnapshotCompareRoute(router, logger);
};
