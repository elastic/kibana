/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { createMonitoringEntitySourceRoute } from './create';
import { getMonitoringEntitySourceRoute } from './get';
import { updateMonitoringEntitySourceRoute } from './update';
import { listMonitoringEntitySourceRoute } from './list';

export const registerMonitoringEntitySourceRoutes = ({
  router,
  logger,
  config,
}: EntityAnalyticsRoutesDeps) => {
  createMonitoringEntitySourceRoute(router, logger);
  getMonitoringEntitySourceRoute(router, logger, config);
  updateMonitoringEntitySourceRoute(router, logger, config);
  listMonitoringEntitySourceRoute(router, logger);
};
