/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationUsageResponse } from '../../../common/types/usage';
import {
  APPLICATION_TAB_ROUTE_OPTIONS,
  APPLICATION_TAB_ROUTE_SECURITY,
  applicationTabRouteParams,
  toApplicationSearch,
} from '../application_tab_route';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';
import { getOtelUsage } from './otel/get_otel_usage';

export const APPLICATION_USAGE_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/usage';

/** The usage route, keyed by its endpoint; `plugin.ts` registers it. */
export const usageRouteRepository = createDigitalExperienceServerRoute({
  endpoint: APPLICATION_USAGE_ENDPOINT,
  options: APPLICATION_TAB_ROUTE_OPTIONS,
  security: APPLICATION_TAB_ROUTE_SECURITY,
  params: applicationTabRouteParams,
  handler: async (resources): Promise<ApplicationUsageResponse> => {
    return getOtelUsage(await toApplicationSearch(resources));
  },
});
