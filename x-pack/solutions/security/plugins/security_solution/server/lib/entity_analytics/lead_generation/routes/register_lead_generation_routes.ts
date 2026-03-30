/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsRoutesDeps } from '../../types';
import { generateLeadsRoute } from './generate_leads';
import { getLeadsRoute } from './get_leads';

export const registerLeadGenerationRoutes = ({ router, logger }: EntityAnalyticsRoutesDeps) => {
  generateLeadsRoute(router, logger);
  getLeadsRoute(router, logger);
};
