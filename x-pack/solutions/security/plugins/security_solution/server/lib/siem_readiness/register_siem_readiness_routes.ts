/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemReadinessRoutesDeps } from './types';
import { getMitreDataIndicesDocsCountRoute } from './routes/get_mitre_data_indices_docs_count';
import { getReadinessRetentionRoute } from './routes/get_readiness_retention';
import { getReadinessPipelinesRoute } from './routes/get_readiness_pipelines';
import { getReadinessQualityRoute } from './routes/get_readiness_quality';
import { getReadinessCoverageRoute } from './routes/get_readiness_coverage';

export const registerSiemReadinessRoutes = ({
  router,
  logger,
  isServerless,
  getStartServices,
}: SiemReadinessRoutesDeps) => {
  getMitreDataIndicesDocsCountRoute(router, logger);
  getReadinessRetentionRoute(router, logger, isServerless);
  getReadinessPipelinesRoute(router, logger, isServerless);
  getReadinessQualityRoute(router, logger);
  getReadinessCoverageRoute(router, logger, getStartServices);
};
