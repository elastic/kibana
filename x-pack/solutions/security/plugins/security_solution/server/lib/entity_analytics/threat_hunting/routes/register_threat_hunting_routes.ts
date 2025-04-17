/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsRoutesDeps } from '../../types';
import { listThreatHuntingQueriesRoute } from './list';

export const registerThreatHuntingRoutes = ({
  router,
  logger,
  getStartServices,
  config,
}: EntityAnalyticsRoutesDeps) => {
  listThreatHuntingQueriesRoute(router, logger);
};
