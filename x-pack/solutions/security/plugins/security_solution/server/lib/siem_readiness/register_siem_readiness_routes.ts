/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemReadinessRoutesDeps } from './types';
import { getReadinessCategoriesRoute } from './routes/get_readiness_categories';
import { getMitreDataIndicesDocsCountRoute } from './routes/get_mitre_data_indices_docs_count';
import { getReadinessPipelinesRoute } from './routes/get_readiness_pipelines';

export const registerSiemReadinessRoutes = ({ router, logger }: SiemReadinessRoutesDeps) => {
  getReadinessCategoriesRoute(router, logger);
  getMitreDataIndicesDocsCountRoute(router, logger);
  getReadinessPipelinesRoute(router, logger);
};
