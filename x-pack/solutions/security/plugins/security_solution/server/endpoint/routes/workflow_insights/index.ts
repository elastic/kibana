/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerUpdateInsightsRoute } from './update_insight';
import { registerGetInsightsRoute } from './get_insights';
import { registerCreateInsightsRoute } from './create_insights';
import { registerGetPendingRoute } from './get_pending';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { ConfigType } from '../../..';
import type { EndpointAppContext } from '../../types';

export const AUTOMATIC_TROUBLESHOOTING_TAG = 'automatic-troubleshooting';

/** Guard against N×M explosion when both insightTypes and endpointIds are large. */
export const MAX_COMBOS = 20;

export const registerWorkflowInsightsRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  endpointContext: EndpointAppContext
) => {
  registerGetInsightsRoute(router, endpointContext);
  registerUpdateInsightsRoute(router, endpointContext);
  registerCreateInsightsRoute(router, endpointContext);
  registerGetPendingRoute(router, endpointContext);
};
