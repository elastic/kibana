/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemReadinessRoutesDeps } from './types';
import { postReadinessTaskRoute } from './routes/post_readiness_task';

export const registerSiemReadinessRoutes = ({ router, logger }: SiemReadinessRoutesDeps) => {
  postReadinessTaskRoute(router, logger);
};
