/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsRoutesDeps } from '../../types';
import { generateLeadsRoute } from './generate_leads';
import { getLeadsRoute } from './get_leads';
import { getLeadGenerationStatusRoute } from './get_lead_generation_status';
import { dismissLeadRoute } from './dismiss_lead';
import { bulkUpdateLeadsRoute } from './bulk_update_leads';
import { enableLeadGenerationRoute } from './enable_lead_generation';
import { disableLeadGenerationRoute } from './disable_lead_generation';
import { getLeadGenerationPrivilegesRoute } from './get_lead_generation_privileges';

export const registerLeadGenerationRoutes = ({
  router,
  logger,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  generateLeadsRoute(router, logger, getStartServices);
  getLeadsRoute(router, logger);
  getLeadGenerationStatusRoute(router, logger, getStartServices);
  dismissLeadRoute(router, logger);
  bulkUpdateLeadsRoute(router, logger);
  enableLeadGenerationRoute(router, logger, getStartServices);
  disableLeadGenerationRoute(router, logger, getStartServices);
  getLeadGenerationPrivilegesRoute(router, logger, getStartServices);
};
